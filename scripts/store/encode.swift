// Encodes a numbered PNG frame sequence into an App Store app preview with AVFoundation (no
// ffmpeg): H.264 High Profile Level 4.0 in an .mp4 at the frames' size and the given frame rate,
// with a song muxed in as stereo AAC at 256 kbps (faded in and out), as Apple's app preview
// specification asks. Then it reads the file back, prints what it holds, and saves a few frames
// of it as PNGs so they can be looked at.
//
//   swiftc -O -swift-version 5 scripts/store/encode.swift -o encode
//   encode --frames <dir of NNNNNN.png> --fps 30 --out <file.mp4>
//          [--audio <file.mp4|.m4a> --audio-start <s> --fade-in <s> --fade-out <s>]
//          [--bitrate <bits/s>] [--check <dir> --check-times 1,5,12]
//
// scripts/store/video.ts compiles and runs it.

import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Options {
    var frames = ""
    var out = ""
    var fps = 30
    var audio: String? = nil
    var audioStart = 0.0
    var fadeIn = 0.0
    var fadeOut = 0.0
    var bitrate = 11_000_000
    var check: String? = nil
    var checkTimes: [Double] = []
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("encode: " + message + "\n").data(using: .utf8)!)
    exit(1)
}

func parse() -> Options {
    var o = Options()
    var args = Array(CommandLine.arguments.dropFirst())
    func next(_ flag: String) -> String {
        guard !args.isEmpty else { fail("\(flag) needs a value") }
        return args.removeFirst()
    }
    func number(_ flag: String) -> Double {
        guard let v = Double(next(flag)) else { fail("\(flag) must be a number") }
        return v
    }
    while !args.isEmpty {
        let flag = args.removeFirst()
        switch flag {
        case "--frames": o.frames = next(flag)
        case "--out": o.out = next(flag)
        case "--fps": o.fps = Int(number(flag))
        case "--audio": o.audio = next(flag)
        case "--audio-start": o.audioStart = number(flag)
        case "--fade-in": o.fadeIn = number(flag)
        case "--fade-out": o.fadeOut = number(flag)
        case "--bitrate": o.bitrate = Int(number(flag))
        case "--check": o.check = next(flag)
        case "--check-times": o.checkTimes = next(flag).split(separator: ",").compactMap { Double($0) }
        default: fail("unknown option \(flag)")
        }
    }
    if o.frames.isEmpty || o.out.isEmpty { fail("--frames and --out are required") }
    return o
}

// Progress lines show as they happen even through a pipe (video.ts runs this).
setlinebuf(stdout)
let opts = parse()

// ---------------------------------------------------------------- the frames

let frameFiles = (try? FileManager.default.contentsOfDirectory(atPath: opts.frames))?
    .filter { $0.hasSuffix(".png") }
    .sorted() ?? []
guard !frameFiles.isEmpty else { fail("no .png frames in \(opts.frames)") }

func loadImage(_ path: String) -> CGImage {
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else { fail("could not read \(path)") }
    return image
}

let first = loadImage(opts.frames + "/" + frameFiles[0])
let width = first.width
let height = first.height
let fps = Int32(opts.fps)
let duration = Double(frameFiles.count) / Double(opts.fps)
print("encode: \(frameFiles.count) frames, \(width)x\(height), \(opts.fps) fps, \(String(format: "%.2f", duration)) s")

// ---------------------------------------------------------------- the writer

let outURL = URL(fileURLWithPath: opts.out)
try? FileManager.default.removeItem(at: outURL)
guard let writer = try? AVAssetWriter(outputURL: outURL, fileType: .mp4) else { fail("could not open \(opts.out) for writing") }

let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: opts.bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264High40,
        AVVideoMaxKeyFrameIntervalKey: opts.fps,
        AVVideoExpectedSourceFrameRateKey: opts.fps,
        AVVideoAllowFrameReorderingKey: true,
    ] as [String: Any],
]
let videoIn = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
videoIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: videoIn,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ]
)
guard writer.canAdd(videoIn) else { fail("the writer can't take the video input") }
writer.add(videoIn)

// The song: read as PCM through an audio mix (the fades), written back as AAC 256 kbps.
var reader: AVAssetReader? = nil
var audioOut: AVAssetReaderAudioMixOutput? = nil
var audioIn: AVAssetWriterInput? = nil
let audioStart = CMTime(seconds: opts.audioStart, preferredTimescale: 48000)
if let audioPath = opts.audio {
    let asset = AVURLAsset(url: URL(fileURLWithPath: audioPath))
    guard let track = asset.tracks(withMediaType: .audio).first else { fail("no audio track in \(audioPath)") }
    guard let r = try? AVAssetReader(asset: asset) else { fail("could not read \(audioPath)") }
    let pcm: [String: Any] = [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: 48000,
        AVNumberOfChannelsKey: 2,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsNonInterleaved: false,
    ]
    let out = AVAssetReaderAudioMixOutput(audioTracks: [track], audioSettings: pcm)
    let end = CMTime(seconds: opts.audioStart + duration, preferredTimescale: 48000)
    let params = AVMutableAudioMixInputParameters(track: track)
    if opts.fadeIn > 0 {
        params.setVolumeRamp(fromStartVolume: 0, toEndVolume: 1, timeRange: CMTimeRange(start: audioStart, duration: CMTime(seconds: opts.fadeIn, preferredTimescale: 48000)))
    }
    if opts.fadeOut > 0 {
        let fade = CMTime(seconds: opts.fadeOut, preferredTimescale: 48000)
        params.setVolumeRamp(fromStartVolume: 1, toEndVolume: 0, timeRange: CMTimeRange(start: end - fade, duration: fade))
    }
    let mix = AVMutableAudioMix()
    mix.inputParameters = [params]
    out.audioMix = mix
    out.alwaysCopiesSampleData = false
    guard r.canAdd(out) else { fail("the reader can't take the audio output") }
    r.add(out)
    r.timeRange = CMTimeRange(start: audioStart, end: end)
    let aac: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: 48000,
        AVNumberOfChannelsKey: 2,
        AVEncoderBitRateKey: 256_000,
    ]
    let input = AVAssetWriterInput(mediaType: .audio, outputSettings: aac)
    input.expectsMediaDataInRealTime = false
    guard writer.canAdd(input) else { fail("the writer can't take the audio input") }
    writer.add(input)
    reader = r
    audioOut = out
    audioIn = input
}

guard writer.startWriting() else { fail("could not start writing: \(writer.error?.localizedDescription ?? "?")") }
writer.startSession(atSourceTime: .zero)
if let r = reader, !r.startReading() { fail("could not start reading the song: \(r.error?.localizedDescription ?? "?")") }
guard let pool = adaptor.pixelBufferPool else { fail("no pixel buffer pool") }

/** The frame image copied into a BGRA pixel buffer from the pool. */
func pixelBuffer(of image: CGImage) -> CVPixelBuffer {
    var buffer: CVPixelBuffer? = nil
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
    guard status == kCVReturnSuccess, let pb = buffer else { fail("could not make a pixel buffer (\(status))") }
    CVPixelBufferLockBaseAddress(pb, [])
    defer { CVPixelBufferUnlockBaseAddress(pb, []) }
    guard let ctx = CGContext(
        data: CVPixelBufferGetBaseAddress(pb),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pb),
        space: CGColorSpace(name: CGColorSpace.sRGB)!,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else { fail("could not draw into the pixel buffer") }
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return pb
}

/** A sample buffer with its timing moved back by the audio's start, so the song begins with the first frame. */
func retimed(_ sample: CMSampleBuffer) -> CMSampleBuffer {
    if opts.audioStart == 0 { return sample }
    var timing = CMSampleTimingInfo(
        duration: CMSampleBufferGetDuration(sample),
        presentationTimeStamp: CMSampleBufferGetPresentationTimeStamp(sample) - audioStart,
        decodeTimeStamp: .invalid
    )
    var copy: CMSampleBuffer? = nil
    let status = CMSampleBufferCreateCopyWithNewTiming(allocator: nil, sampleBuffer: sample, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleBufferOut: &copy)
    guard status == noErr, let c = copy else { fail("could not retime an audio buffer (\(status))") }
    return c
}

// Interleave: the stream that is behind gets the next piece when its input is ready; else the
// other one, if the writer is ready for it (it holds an input back until the other has caught
// up, so waiting on one input alone can wait forever); else a moment's pause.
var frameIndex = 0
var audioDone = audioOut == nil
var audioTime = 0.0
while frameIndex < frameFiles.count || !audioDone {
    let videoTime = Double(frameIndex) / Double(opts.fps)
    let videoLeft = frameIndex < frameFiles.count
    let audioBehind = !audioDone && (!videoLeft || audioTime <= videoTime)
    let audioReady = !audioDone && (audioIn?.isReadyForMoreMediaData ?? false)
    let videoReady = videoLeft && videoIn.isReadyForMoreMediaData
    if audioReady && (audioBehind || !videoReady), let out = audioOut, let input = audioIn {
        if let sample = out.copyNextSampleBuffer() {
            let s = retimed(sample)
            guard input.append(s) else { fail("could not write audio: \(writer.error?.localizedDescription ?? "?")") }
            audioTime = (CMSampleBufferGetPresentationTimeStamp(s) + CMSampleBufferGetDuration(s)).seconds
        } else {
            input.markAsFinished()
            audioDone = true
            if let r = reader, r.status == .failed { fail("reading the song failed: \(r.error?.localizedDescription ?? "?")") }
        }
    } else if videoReady {
        let image = loadImage(opts.frames + "/" + frameFiles[frameIndex])
        guard image.width == width, image.height == height else { fail("\(frameFiles[frameIndex]) is \(image.width)x\(image.height), not \(width)x\(height)") }
        let pb = pixelBuffer(of: image)
        guard adaptor.append(pb, withPresentationTime: CMTime(value: CMTimeValue(frameIndex), timescale: fps)) else {
            fail("could not write frame \(frameIndex): \(writer.error?.localizedDescription ?? "?")")
        }
        frameIndex += 1
        if frameIndex % 150 == 0 { print("encode: \(frameIndex)/\(frameFiles.count) frames") }
    } else {
        usleep(2000)
        if writer.status == .failed { fail("writing failed: \(writer.error?.localizedDescription ?? "?")") }
    }
}
videoIn.markAsFinished()
writer.endSession(atSourceTime: CMTime(value: CMTimeValue(frameFiles.count), timescale: fps))
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fail("writing failed: \(writer.error?.localizedDescription ?? "?")") }

// ---------------------------------------------------------------- read it back

let written = AVURLAsset(url: outURL)
let bytes = (try? FileManager.default.attributesOfItem(atPath: opts.out)[.size] as? Int) ?? 0
print("encode: wrote \(opts.out): \(String(format: "%.2f", written.duration.seconds)) s, \(bytes / 1024) kB")
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
        print("encode:   video \(codecs) \(Int(track.naturalSize.width))x\(Int(track.naturalSize.height)) \(String(format: "%.2f", track.nominalFrameRate)) fps \(Int(track.estimatedDataRate / 1000)) kbps")
    } else if track.mediaType == .audio {
        var rate = 0.0
        var channels = 0
        if let desc = track.formatDescriptions.first, let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(desc as! CMFormatDescription) {
            rate = asbd.pointee.mSampleRate
            channels = Int(asbd.pointee.mChannelsPerFrame)
        }
        print("encode:   audio \(codecs) \(Int(rate)) Hz \(channels) ch \(Int(track.estimatedDataRate / 1000)) kbps")
    }
}

if let dir = opts.check, !opts.checkTimes.isEmpty {
    try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
    let generator = AVAssetImageGenerator(asset: written)
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    generator.appliesPreferredTrackTransform = true
    for t in opts.checkTimes {
        let time = CMTime(seconds: t, preferredTimescale: 600)
        guard let image = try? generator.copyCGImage(at: time, actualTime: nil) else { fail("could not read the frame at \(t) s back") }
        let file = String(format: "%@/at-%05.2fs.png", dir, t)
        guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: file) as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("could not write \(file)") }
        CGImageDestinationAddImage(dest, image, nil)
        guard CGImageDestinationFinalize(dest) else { fail("could not finish \(file)") }
        print("encode:   frame at \(t) s -> \(file)")
    }
}
