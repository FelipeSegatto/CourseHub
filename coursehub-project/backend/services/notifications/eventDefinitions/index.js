/**
 * Side-effect-only module: requiring it registers every notification
 * type in notificationTypeRegistry.js. Required once at server
 * startup (server.js) so the registry is populated before any route
 * can try to emit an event. New event definitions (stage 5+) get
 * their own file here and one require line added below.
 */
require("./learningActivityPublished");
require("./learningActivityChanged");
require("./learningActivityCancelled");
require("./learningContentPublished");
require("./learningContentChanged");
require("./learningContentCancelled");
require("./learningSessionScheduled");
require("./learningSessionChanged");
require("./learningSessionCancelled");
require("./learningSubmissionReceived");
require("./learningGradePublished");
require("./learningAttendanceFlagged");
