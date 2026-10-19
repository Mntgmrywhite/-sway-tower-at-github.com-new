// Re-encodes a finished .mp4 (the App Store preview) for the web (no ffmpeg): scaled down to
// --width (the height follows, both even), H.264 High 4.0 at --bitrate with the moov atom up
// front (fast start), the audio re-encoded as stereo AAC at --audio-bitrate. Then it reads the
// file back, prints its tracks and size, and saves the frame at --poster-time as a PNG (the
// <video> poster). AVFoundation does the scaling (a video composition at the render size).
//
//   swiftc -O -swift-version 5 scripts/store/transcode.swift -o transcode
//   transcode --in <preview.mp4> --out <web.mp4> [--width 720] [--bitrate 2800000]
//             [--audio-bitrate 128000] [--poster <file.png> --poster-time 1.0]
//
// scripts/store/site.ts compiles and runs it.

import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Options {
    var input = ""
    var out = ""
    var width = 720
    var bitrate = 2_800_000
    var audioBitrate = 128_000
    var poster: String? = nil
    var posterTime = 1.0
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("transcode: " + message + "\n").data(using: .utf8)!)
    exit(1)
}

func number(_ value: String, _ flag: String) -> Int {
    guard let n = Int(value) else { fail("bad \(flag)") }
    return n
}

var opts = Options()
var args = Array(CommandLine.arguments.dropFirst())
while !args.isEmpty {
    let flag = args.removeFirst()
    guard !args.isEmpty else { fail("\(flag) needs a value") }
    let value = args.removeFirst()
    switch flag {
    case "--in": opts.input = value
    case "--out": opts.out = value
    case "--width": opts.width = number(value, flag)
    case "--bitrate": opts.bitrate = number(value, flag)
    case "--audio-bitrate": opts.audioBitrate = number(value, flag)
    case "--poster": opts.poster = value
    case "--poster-time":
        guard let t = Double(value) else { fail("bad \(flag)") }
        opts.posterTime = t
    default: fail("unknown option \(flag)")
    }
}
guard !opts.input.isEmpty, !opts.out.isEmpty else { fail("--in and --out are required") }

// ---------------------------------------------------------------- the source

let asset = AVURLAsset(url: URL(fileURLWithPath: opts.input))
guard let videoTrack = asset.tracks(withMediaType: .video).first else { fail("no video track in \(opts.input)") }
let audioTrack = asset.tracks(withMediaType: .audio).first
let natural = videoTrack.naturalSize
let fps = videoTrack.nominalFrameRate > 0 ? videoTrack.nominalFrameRate : 30
let outW = max(2, opts.width / 2 * 2)
let outH = max(2, Int((natural.height * CGFloat(outW) / natural.width).rounded()) / 2 * 2)
let duration = asset.duration
print("transcode: \(opts.input): \(Int(natural.width))x\(Int(natural.height)) -> \(outW)x\(outH), \(String(format: "%.2f", duration.seconds)) s, \(Int(fps)) fps")

guard let reader = try? AVAssetReader(asset: asset) else { fail("could not read \(opts.input)") }

// The video, scaled by a composition at the output size.
let composition = AVMutableVideoComposition()
composition.renderSize = CGSize(width: outW, height: outH)
composition.frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps.rounded()))
let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
layer.setTransform(CGAffineTransform(scaleX: CGFloat(outW) / natural.width, y: CGFloat(outH) / natural.height), at: .zero)
instruction.layerInstructions = [layer]
composition.instructions = [instruction]
let videoOut = AVAssetReaderVideoCompositionOutput(videoTracks: [videoTrack], videoSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
])
videoOut.videoComposition = composition
videoOut.alwaysCopiesSampleData = false
guard reader.canAdd(videoOut) else { fail("the reader can't take the video output") }
reader.add(videoOut)

var audioOut: AVAssetReaderTrackOutput? = nil
if let track = audioTrack {
    let pcm: [String: Any] = [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: 48000,
        AVNumberOfChannelsKey: 2,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsNonInterleaved: false,
    ]
    let out = AVAssetReaderTrackOutput(track: track, outputSettings: pcm)
    out.alwaysCopiesSampleData = false
    guard reader.canAdd(out) else { fail("the reader can't take the audio output") }
    reader.add(out)
    audioOut = out
}

// ---------------------------------------------------------------- the writer

let outURL = URL(fileURLWithPath: opts.out)
try? FileManager.default.removeItem(at: outURL)
guard let writer = try? AVAssetWriter(outputURL: outURL, fileType: .mp4) else { fail("could not open \(opts.out) for writing") }
writer.shouldOptimizeForNetworkUse = true

let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: outW,
    AVVideoHeightKey: outH,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: opts.bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264High40,
        AVVideoMaxKeyFrameIntervalKey: Int(fps.rounded()) * 2,
        AVVideoExpectedSourceFrameRateKey: Int(fps.rounded()),
        AVVideoAllowFrameReorderingKey: true,
    ] as [String: Any],
]
let videoIn = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
videoIn.expectsMediaDataInRealTime = false
guard writer.canAdd(videoIn) else { fail("the writer can't take the video input") }
writer.add(videoIn)

var audioIn: AVAssetWriterInput? = nil
if audioOut != nil {
    let aac: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: 48000,
        AVNumberOfChannelsKey: 2,
        AVEncoderBitRateKey: opts.audioBitrate,
    ]
    let input = AVAssetWriterInput(mediaType: .audio, outputSettings: aac)
    input.expectsMediaDataInRealTime = false
    guard writer.canAdd(input) else { fail("the writer can't take the audio input") }
    writer.add(input)
    audioIn = input
}

guard writer.startWriting() else { fail("could not start writing: \(writer.error?.localizedDescription ?? "?")") }
writer.startSession(atSourceTime: .zero)
guard reader.startReading() else { fail("could not start reading: \(reader.error?.localizedDescription ?? "?")") }

// Interleave as encode.swift does: the stream that is behind goes next when its input is ready;
// else the other, if ready; else a moment's pause (the writer holds an input back until the
// other has caught up, so waiting on one alone can wait forever).
var videoDone = false
var audioDone = audioOut == nil
var videoTime = 0.0
var audioTime = 0.0
var frames = 0
while !videoDone || !audioDone {
    let audioBehind = !audioDone && (videoDone || audioTime <= videoTime)
    let audioReady = !audioDone && (audioIn?.isReadyForMoreMediaData ?? false)
    let videoReady = !videoDone && videoIn.isReadyForMoreMediaData
    if audioReady && (audioBehind || !videoReady), let out = audioOut, let input = audioIn {
        if let sample = out.copyNextSampleBuffer() {
            guard input.append(sample) else { fail("could not write audio: \(writer.error?.localizedDescription ?? "?")") }
            audioTime = (CMSampleBufferGetPresentationTimeStamp(sample) + CMSampleBufferGetDuration(sample)).seconds
        } else {
            input.markAsFinished()
            audioDone = true
        }
    } else if videoReady {
        if let sample = videoOut.copyNextSampleBuffer() {
            guard videoIn.append(sample) else { fail("could not write video: \(writer.error?.localizedDescription ?? "?")") }
            videoTime = CMSampleBufferGetPresentationTimeStamp(sample).seconds
            frames += 1
            if frames % 150 == 0 { print("transcode: \(frames) frames (\(String(format: "%.1f", videoTime)) s)") }
        } else {
            videoIn.markAsFinished()
            videoDone = true
        }
    } else {
        usleep(2000)
        if writer.status == .failed { fail("writing failed: \(writer.error?.localizedDescription ?? "?")") }
        if reader.status == .failed { fail("reading failed: \(reader.error?.localizedDescription ?? "?")") }
    }
}
if reader.status == .failed { fail("reading failed: \(reader.error?.localizedDescription ?? "?")") }
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fail("writing failed: \(writer.error?.localizedDescription ?? "?")") }
// The fast-start rewrite leaves its "<out>.sb-…" sidecar behind when the process exits right away: remove it.
let outDir = outURL.deletingLastPathComponent()
for name in (try? FileManager.default.contentsOfDirectory(atPath: outDir.path)) ?? [] where name.hasPrefix(outURL.lastPathComponent + ".sb-") {
    try? FileManager.default.removeItem(at: outDir.appendingPathComponent(name))
}

// ---------------------------------------------------------------- read it back

let written = AVURLAsset(url: outURL)
let bytes = (try? FileManager.default.attributesOfItem(atPath: opts.out)[.size] as? Int) ?? 0
print("transcode: wrote \(opts.out): \(String(format: "%.2f", written.duration.seconds)) s, \(frames) frames, \(bytes / 1024) kB")
for track in written.tracks {
    let codecs = track.formatDescriptions
        .map { $0 as! CMFormatDescription }
        .map { desc -> String in
            let type = CMFormatDescriptionGetMediaSubType(desc)
            let chars = [24, 16, 8, 0].map { Character(UnicodeScalar(UInt8((type >> UInt32($0)) & 0xff))) }
            return String(chars)
        }
        .joined(separator: ",")
    if track.mediaType == .video {
        print("transcode:   video \(codecs) \(Int(track.naturalSize.width))x\(Int(track.naturalSize.height)) \(String(format: "%.2f", track.nominalFrameRate)) fps \(Int(track.estimatedDataRate / 1000)) kbps")
    } else if track.mediaType == .audio {
        var rate = 0.0
        var channels = 0
        if let desc = track.formatDescriptions.first, let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(desc as! CMFormatDescription) {
            rate = asbd.pointee.mSampleRate
            channels = Int(asbd.pointee.mChannelsPerFrame)
        }
        print("transcode:   audio \(codecs) \(Int(rate)) Hz \(channels) ch \(Int(track.estimatedDataRate / 1000)) kbps")
    }
}

if let poster = opts.poster {
    let generator = AVAssetImageGenerator(asset: written)
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    generator.appliesPreferredTrackTransform = true
    let time = CMTime(seconds: opts.posterTime, preferredTimescale: 600)
    guard let image = try? generator.copyCGImage(at: time, actualTime: nil) else { fail("could not read the frame at \(opts.posterTime) s back") }
    guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: poster) as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("could not write \(poster)") }
    CGImageDestinationAddImage(dest, image, nil)
    guard CGImageDestinationFinalize(dest) else { fail("could not finish \(poster)") }
    print("transcode:   poster at \(opts.posterTime) s -> \(poster)")
}
