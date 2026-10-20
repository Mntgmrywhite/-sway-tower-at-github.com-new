import Foundation
import Capacitor
import GameKit
import LinkPresentation
import StoreKit
import UIKit

/// The game's own native bits, reached from the page as the "Native" plugin (src/native/native.ts):
/// the App Store review prompt, opening a page outside the app (the App Store's review page),
/// Game Center (src/native/gamecenter.ts: sign-in, the two leaderboards, the medals as
/// achievements, the access point) and the share sheet (src/share.ts: the tower as a picture).
/// Registered by GameViewController (SceneDelegate.swift). No network of its own, nothing stored.
@objc(NativePlugin)
public class NativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePlugin"
    public let jsName = "Native"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openUrl", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showAchievements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAccessPoint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
    ]

    /// Calls to `authenticate` waiting on GameKit's answer (resolved together).
    private var pendingAuth: [CAPPluginCall] = []
    /// Whether GameKit's sign-in sheet went up during the ask in progress.
    private var sheetShown = false
    /// Each ask's number, so a watchdog only ends the ask it was set for.
    private var authAsk = 0
    /// How long an ask waits for GameKit without its sheet before it is answered "not signed in".
    private static let authWatchdog: TimeInterval = 10

    /// The view controller to present over: the game's, or whatever is up over it already
    /// (GameKit's sheet, a dashboard, the share sheet). Presenting from one that already
    /// presents something fails silently, its completion never comes, and the page would wait
    /// for it forever (a share in progress takes no taps; a sign-in in progress pauses the game).
    private func presenter() -> UIViewController? {
        guard var top = bridge?.viewController else { return nil }
        while let next = top.presentedViewController, !next.isBeingDismissed {
            top = next
        }
        return top
    }

    // MARK: - App Store

    /// Ask StoreKit for the in-app review prompt. It decides whether to show it (a few times a
    /// year at most); `requested` only says it was asked, in a window that could show it.
    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.resolve(["requested": false])
                return
            }
            if #available(iOS 16.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve(["requested": true])
        }
    }

    /// Open a web or App Store link outside the app.
    @objc func openUrl(_ call: CAPPluginCall) {
        guard let string = call.getString("url"),
              let url = URL(string: string),
              let scheme = url.scheme?.lowercased(),
              scheme == "https" || scheme == "itms-apps" else {
            call.reject("Not a link the app opens")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("Could not open the link")
                }
            }
        }
    }

    // MARK: - Game Center

    /// Sign the local player in. A signed-in player resolves at once. Otherwise GameKit is asked:
    /// it may hand over its sign-in sheet, which is presented over the game (the page hears
    /// "presenting" and pauses, then "done"), and the call resolves once GameKit has an answer:
    /// `authenticated` and the alias, or `cancelled` when the player dismissed the sheet. The
    /// sheet is only ever presented while an ask is pending: GameKit calling back on its own
    /// later (a return to the foreground) never puts it up unasked; such a late answer reaches
    /// the page as a "done" event with the player's state instead (a player who signed in under
    /// Settings and came back). GameKit does not always call back after a failure (no account on
    /// a simulator), so an ask with no sheet up is answered "not signed in" after a watchdog.
    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let player = GKLocalPlayer.local
            if player.isAuthenticated {
                call.resolve(self.authResult(cancelled: false))
                return
            }
            self.pendingAuth.append(call)
            if self.pendingAuth.count > 1 { return } // an ask is in progress; this one rides along
            self.sheetShown = false
            self.authAsk += 1
            let ask = self.authAsk
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.authWatchdog) { [weak self] in
                guard let self = self, self.authAsk == ask, !self.sheetShown else { return }
                self.answerAuth(cancelled: false)
            }
            // Setting the handler starts (or restarts) GameKit's authentication.
            player.authenticateHandler = { [weak self] viewController, error in
                guard let self = self else { return }
                if let viewController = viewController {
                    guard !self.pendingAuth.isEmpty else { return }
                    guard let host = self.presenter() else {
                        self.answerAuth(cancelled: false)
                        return
                    }
                    self.sheetShown = true
                    self.notifyListeners("gameCenter", data: ["state": "presenting"])
                    host.present(viewController, animated: true)
                    return
                }
                let cancelled = (error as NSError?).map { $0.domain == GKErrorDomain && $0.code == GKError.cancelled.rawValue } ?? false
                self.answerAuth(cancelled: cancelled)
            }
        }
    }

    /// GameKit's answer (or the watchdog's): the waiting calls resolve with it, and the page hears
    /// "done" with the player's state, whether or not anything was waiting.
    private func answerAuth(cancelled: Bool) {
        let result = authResult(cancelled: cancelled)
        let waiting = pendingAuth
        pendingAuth = []
        sheetShown = false
        authAsk += 1
        var event = result
        event["state"] = "done"
        notifyListeners("gameCenter", data: event)
        for pending in waiting {
            pending.resolve(result)
        }
    }

    private func authResult(cancelled: Bool) -> [String: Any] {
        let player = GKLocalPlayer.local
        var result: [String: Any] = ["authenticated": player.isAuthenticated, "cancelled": cancelled, "shown": sheetShown]
        if player.isAuthenticated {
            result["playerAlias"] = player.alias
        }
        return result
    }

    private func signedIn(_ call: CAPPluginCall) -> Bool {
        if GKLocalPlayer.local.isAuthenticated { return true }
        call.reject("Not signed in to Game Center")
        return false
    }

    /// A score to a leaderboard (the tallest tower, per mode; GameKit keeps the best).
    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardId = call.getString("leaderboardId"), let score = call.getInt("score") else {
            call.reject("leaderboardId and score are needed")
            return
        }
        guard signedIn(call) else { return }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    /// Achievements at `percent` complete (100 earns them), in one report. `banner` (true unless
    /// given) shows GameKit's banner for each one newly earned; the sync on sign-in turns it off,
    /// or a player signing in after a week of medals would get a banner per medal.
    @objc func reportAchievements(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids", String.self), !ids.isEmpty else {
            call.reject("ids are needed")
            return
        }
        guard signedIn(call) else { return }
        let percent = call.getDouble("percent") ?? 100
        let banner = call.getBool("banner") ?? true
        let achievements = ids.map { id -> GKAchievement in
            let achievement = GKAchievement(identifier: id)
            achievement.percentComplete = percent
            achievement.showsCompletionBanner = banner
            return achievement
        }
        GKAchievement.report(achievements) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    /// Game Center's own screen for one leaderboard.
    @objc func showLeaderboard(_ call: CAPPluginCall) {
        guard let leaderboardId = call.getString("leaderboardId") else {
            call.reject("leaderboardId is needed")
            return
        }
        DispatchQueue.main.async {
            self.present(GKGameCenterViewController(leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime), for: call)
        }
    }

    /// Game Center's own screen for the achievements.
    @objc func showAchievements(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.present(GKGameCenterViewController(state: .achievements), for: call)
        }
    }

    private func present(_ dashboard: GKGameCenterViewController, for call: CAPPluginCall) {
        guard signedIn(call) else { return }
        guard let host = presenter() else {
            call.reject("No window to show it in")
            return
        }
        dashboard.gameCenterDelegate = self
        host.present(dashboard, animated: true)
        call.resolve()
    }

    /// The access point (the player's Game Center bubble): on for the title screen, off during a
    /// run and under the sheets; the page only turns it on for a signed-in player. Bottom-leading,
    /// over the scenery: the top corners belong to the logo (which reaches within 6% of the edges
    /// on a narrow phone) and the run's buttons.
    @objc func setAccessPoint(_ call: CAPPluginCall) {
        let active = call.getBool("active") ?? false
        DispatchQueue.main.async {
            let accessPoint = GKAccessPoint.shared
            accessPoint.location = .bottomLeading
            accessPoint.showHighlights = false
            accessPoint.isActive = active
            call.resolve()
        }
    }

    // MARK: - Share

    /// The system share sheet with a PNG (base64), a line of text and, when given, an https link.
    /// `rect` (CSS px in the page, which are points in the web view) anchors the iPad popover
    /// to the Share button; without it the popover sits mid-screen with no arrow.
    @objc func share(_ call: CAPPluginCall) {
        guard let png = call.getString("png"), let data = Data(base64Encoded: png), let image = UIImage(data: data) else {
            call.reject("A PNG is needed")
            return
        }
        let text = call.getString("text") ?? ""
        // The picture first, with the line as its title, so the sheet's header shows the tower
        // and the words (a bare UIImage among strings gets a plain text icon there).
        var items: [Any] = [SharedPicture(image: image, title: text)]
        if !text.isEmpty {
            items.append(text)
        }
        if let link = call.getString("url"), let url = URL(string: link), url.scheme?.lowercased() == "https" {
            items.append(url)
        }
        DispatchQueue.main.async {
            guard let host = self.presenter(), let webView = self.bridge?.webView else {
                call.reject("No window to share from")
                return
            }
            let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = webView
                if let rect = call.getObject("rect"),
                   let x = Self.number(rect["x"]), let y = Self.number(rect["y"]),
                   let w = Self.number(rect["width"]), let h = Self.number(rect["height"]) {
                    popover.sourceRect = CGRect(x: x, y: y, width: w, height: h)
                } else {
                    popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
                    popover.permittedArrowDirections = []
                }
            }
            sheet.completionWithItemsHandler = { _, completed, _, _ in
                call.resolve(["completed": completed])
            }
            host.present(sheet, animated: true)
        }
    }

    private static func number(_ value: JSValue?) -> Double? {
        if let double = value as? Double { return double }
        if let int = value as? Int { return Double(int) }
        if let number = value as? NSNumber { return number.doubleValue }
        return nil
    }
}

extension NativePlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}

/// The tower's picture as a share item: the picture itself for every activity, and link
/// metadata (the picture and the line as its title) for the share sheet's header.
private final class SharedPicture: NSObject, UIActivityItemSource {
    private let image: UIImage
    private let title: String

    init(image: UIImage, title: String) {
        self.image = image
        self.title = title
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        image
    }

    func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
        image
    }

    func activityViewControllerLinkMetadata(_ activityViewController: UIActivityViewController) -> LPLinkMetadata? {
        let metadata = LPLinkMetadata()
        metadata.title = title.isEmpty ? "Sway Tower" : title
        metadata.imageProvider = NSItemProvider(object: image)
        return metadata
    }
}
