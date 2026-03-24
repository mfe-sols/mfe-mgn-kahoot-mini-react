import type { AppModel } from "../model";
import { formatTitle } from "../usecase";
import { trKahootMini } from "../../i18n/domain-messages";

export type AppViewModel = {
  appName: string;
  title: string;
  subtitle: string;
  introEyebrow: string;
  introBody: string;
  questions: AppModel["questions"];
  timePerQuestionSec: number;
  pointsPerCorrect: number;
  labels: {
    pinTitle: string;
    pinSubtitle: string;
    accessTitle: string;
    accessSubtitle: string;
    accessLabel: string;
    accessPlaceholder: string;
    accessSubmit: string;
    accessError: string;
    pinLabel: string;
    pinPlaceholder: string;
    pinJoin: string;
    pinGenerate: string;
    pinHint: string;
    pinError: string;
    pinCode: string;
    pinLocked: string;
    pinLoading: string;
    pinUnavailable: string;
    pinExpiresAt: string;
    pinCountdown: string;
    hostPanelTitle: string;
    hostPanelSubtitle: string;
    hostConnectedUsers: string;
    hostWaitingPlayers: string;
    hostLastPing: string;
    hostPlayersTitle: string;
    hostPlayersEmpty: string;
    hostQrTitle: string;
    hostQrSubtitle: string;
    hostQrLinkLabel: string;
    hostQrCopy: string;
    hostQrCopied: string;
    hostActionError: string;
    hostStart: string;
    hostStarting: string;
    hostNext: string;
    hostNextWaiting: string;
    hostNextReady: string;
    hostFinish: string;
    hostFinishing: string;
    sessionPhase: string;
    playersConnected: string;
    realtimeStatus: string;
    realtimeConnected: string;
    realtimeConnecting: string;
    realtimeError: string;
    realtimeIdle: string;
    phaseLobby: string;
    phaseQuestionLive: string;
    phaseQuestionClosed: string;
    phaseCompleted: string;
    playerScore: string;
    playerAnswers: string;
    playerCorrect: string;
    playerJoinedAt: string;
    topOne: string;
    topTwo: string;
    leaderboardTitle: string;
    leaderboardSubtitle: string;
    leaderboardLoading: string;
    leaderboardEmpty: string;
    start: string;
    restart: string;
    submit: string;
    next: string;
    timer: string;
    question: string;
    score: string;
    correctAnswer: string;
    yourAnswer: string;
    unanswered: string;
    correctState: string;
    incorrectState: string;
    timeoutState: string;
    finalTitle: string;
    finalSubtitle: string;
    reviewTitle: string;
    badgePerfect: string;
    badgeSolid: string;
    badgeRetry: string;
  };
};

const toDomainKey = (commonKey: string) => `mfe.mfe-mgn-kahoot-mini-react.${commonKey}`;

export const createPresenter = (model: AppModel): AppViewModel => ({
  appName: model.appName,
  title: formatTitle(trKahootMini(toDomainKey("title"), "title")),
  subtitle: trKahootMini(toDomainKey("subtitle"), "subtitle"),
  introEyebrow: trKahootMini(toDomainKey("introEyebrow"), "introEyebrow"),
  introBody: trKahootMini(toDomainKey("introBody"), "introBody"),
  questions: model.questions,
  timePerQuestionSec: model.timePerQuestionSec,
  pointsPerCorrect: model.pointsPerCorrect,
  labels: {
    pinTitle: trKahootMini(toDomainKey("pinTitle"), "pinTitle"),
    pinSubtitle: trKahootMini(toDomainKey("pinSubtitle"), "pinSubtitle"),
    accessTitle: trKahootMini(toDomainKey("accessTitle"), "accessTitle"),
    accessSubtitle: trKahootMini(toDomainKey("accessSubtitle"), "accessSubtitle"),
    accessLabel: trKahootMini(toDomainKey("accessLabel"), "accessLabel"),
    accessPlaceholder: trKahootMini(toDomainKey("accessPlaceholder"), "accessPlaceholder"),
    accessSubmit: trKahootMini(toDomainKey("accessSubmit"), "accessSubmit"),
    accessError: trKahootMini(toDomainKey("accessError"), "accessError"),
    pinLabel: trKahootMini(toDomainKey("pinLabel"), "pinLabel"),
    pinPlaceholder: trKahootMini(toDomainKey("pinPlaceholder"), "pinPlaceholder"),
    pinJoin: trKahootMini(toDomainKey("pinJoin"), "pinJoin"),
    pinGenerate: trKahootMini(toDomainKey("pinGenerate"), "pinGenerate"),
    pinHint: trKahootMini(toDomainKey("pinHint"), "pinHint"),
    pinError: trKahootMini(toDomainKey("pinError"), "pinError"),
    pinCode: trKahootMini(toDomainKey("pinCode"), "pinCode"),
    pinLocked: trKahootMini(toDomainKey("pinLocked"), "pinLocked"),
    pinLoading: trKahootMini(toDomainKey("pinLoading"), "pinLoading"),
    pinUnavailable: trKahootMini(toDomainKey("pinUnavailable"), "pinUnavailable"),
    pinExpiresAt: trKahootMini(toDomainKey("pinExpiresAt"), "pinExpiresAt"),
    pinCountdown: trKahootMini(toDomainKey("pinCountdown"), "pinCountdown"),
    hostPanelTitle: trKahootMini(toDomainKey("hostPanelTitle"), "hostPanelTitle"),
    hostPanelSubtitle: trKahootMini(toDomainKey("hostPanelSubtitle"), "hostPanelSubtitle"),
    hostConnectedUsers: trKahootMini(toDomainKey("hostConnectedUsers"), "hostConnectedUsers"),
    hostWaitingPlayers: trKahootMini(toDomainKey("hostWaitingPlayers"), "hostWaitingPlayers"),
    hostLastPing: trKahootMini(toDomainKey("hostLastPing"), "hostLastPing"),
    hostPlayersTitle: trKahootMini(toDomainKey("hostPlayersTitle"), "hostPlayersTitle"),
    hostPlayersEmpty: trKahootMini(toDomainKey("hostPlayersEmpty"), "hostPlayersEmpty"),
    hostQrTitle: trKahootMini(toDomainKey("hostQrTitle"), "hostQrTitle"),
    hostQrSubtitle: trKahootMini(toDomainKey("hostQrSubtitle"), "hostQrSubtitle"),
    hostQrLinkLabel: trKahootMini(toDomainKey("hostQrLinkLabel"), "hostQrLinkLabel"),
    hostQrCopy: trKahootMini(toDomainKey("hostQrCopy"), "hostQrCopy"),
    hostQrCopied: trKahootMini(toDomainKey("hostQrCopied"), "hostQrCopied"),
    hostActionError: trKahootMini(toDomainKey("hostActionError"), "hostActionError"),
    hostStart: trKahootMini(toDomainKey("hostStart"), "hostStart"),
    hostStarting: trKahootMini(toDomainKey("hostStarting"), "hostStarting"),
    hostNext: trKahootMini(toDomainKey("hostNext"), "hostNext"),
    hostNextWaiting: trKahootMini(toDomainKey("hostNextWaiting"), "hostNextWaiting"),
    hostNextReady: trKahootMini(toDomainKey("hostNextReady"), "hostNextReady"),
    hostFinish: trKahootMini(toDomainKey("hostFinish"), "hostFinish"),
    hostFinishing: trKahootMini(toDomainKey("hostFinishing"), "hostFinishing"),
    sessionPhase: trKahootMini(toDomainKey("sessionPhase"), "sessionPhase"),
    playersConnected: trKahootMini(toDomainKey("playersConnected"), "playersConnected"),
    realtimeStatus: trKahootMini(toDomainKey("realtimeStatus"), "realtimeStatus"),
    realtimeConnected: trKahootMini(toDomainKey("realtimeConnected"), "realtimeConnected"),
    realtimeConnecting: trKahootMini(toDomainKey("realtimeConnecting"), "realtimeConnecting"),
    realtimeError: trKahootMini(toDomainKey("realtimeError"), "realtimeError"),
    realtimeIdle: trKahootMini(toDomainKey("realtimeIdle"), "realtimeIdle"),
    phaseLobby: trKahootMini(toDomainKey("phaseLobby"), "phaseLobby"),
    phaseQuestionLive: trKahootMini(toDomainKey("phaseQuestionLive"), "phaseQuestionLive"),
    phaseQuestionClosed: trKahootMini(toDomainKey("phaseQuestionClosed"), "phaseQuestionClosed"),
    phaseCompleted: trKahootMini(toDomainKey("phaseCompleted"), "phaseCompleted"),
    playerScore: trKahootMini(toDomainKey("playerScore"), "playerScore"),
    playerAnswers: trKahootMini(toDomainKey("playerAnswers"), "playerAnswers"),
    playerCorrect: trKahootMini(toDomainKey("playerCorrect"), "playerCorrect"),
    playerJoinedAt: trKahootMini(toDomainKey("playerJoinedAt"), "playerJoinedAt"),
    topOne: trKahootMini(toDomainKey("topOne"), "topOne"),
    topTwo: trKahootMini(toDomainKey("topTwo"), "topTwo"),
    leaderboardTitle: trKahootMini(toDomainKey("leaderboardTitle"), "leaderboardTitle"),
    leaderboardSubtitle: trKahootMini(toDomainKey("leaderboardSubtitle"), "leaderboardSubtitle"),
    leaderboardLoading: trKahootMini(toDomainKey("leaderboardLoading"), "leaderboardLoading"),
    leaderboardEmpty: trKahootMini(toDomainKey("leaderboardEmpty"), "leaderboardEmpty"),
    start: trKahootMini(toDomainKey("start"), "start"),
    restart: trKahootMini(toDomainKey("restart"), "restart"),
    submit: trKahootMini(toDomainKey("submit"), "submit"),
    next: trKahootMini(toDomainKey("next"), "next"),
    timer: trKahootMini(toDomainKey("timer"), "timer"),
    question: trKahootMini(toDomainKey("question"), "question"),
    score: trKahootMini(toDomainKey("score"), "score"),
    correctAnswer: trKahootMini(toDomainKey("correctAnswer"), "correctAnswer"),
    yourAnswer: trKahootMini(toDomainKey("yourAnswer"), "yourAnswer"),
    unanswered: trKahootMini(toDomainKey("unanswered"), "unanswered"),
    correctState: trKahootMini(toDomainKey("correctState"), "correctState"),
    incorrectState: trKahootMini(toDomainKey("incorrectState"), "incorrectState"),
    timeoutState: trKahootMini(toDomainKey("timeoutState"), "timeoutState"),
    finalTitle: trKahootMini(toDomainKey("finalTitle"), "finalTitle"),
    finalSubtitle: trKahootMini(toDomainKey("finalSubtitle"), "finalSubtitle"),
    reviewTitle: trKahootMini(toDomainKey("reviewTitle"), "reviewTitle"),
    badgePerfect: trKahootMini(toDomainKey("badgePerfect"), "badgePerfect"),
    badgeSolid: trKahootMini(toDomainKey("badgeSolid"), "badgeSolid"),
    badgeRetry: trKahootMini(toDomainKey("badgeRetry"), "badgeRetry"),
  },
});
