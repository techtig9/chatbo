(function () {
  "use strict";

  var currentScript = document.currentScript;
  if (!currentScript) return;

  var botId = currentScript.getAttribute("data-bot-id");
  if (!botId) {
    console.error("chatbo.ai widget: missing data-bot-id attribute");
    return;
  }

  var position = currentScript.getAttribute("data-position") || "bottom-right";
  // Default falls back to ink (#12233A), not signal teal — signal
  // measures ~2.99:1 against white and fails WCAG's 3:1 floor for the
  // white bubble icon rendered on top of it. See lib/a11y/contrast.ts.
  var brandColor = currentScript.getAttribute("data-brand-color") || "#12233A";
  // Derived from this script's own src so the same loader works whether
  // it's served from a staging or production chatbo.ai domain, rather
  // than hardcoding one origin into the file.
  var origin = new URL(currentScript.src).origin;

  var isBottomLeft = position === "bottom-left";
  var sideStyle = isBottomLeft ? "left: 20px;" : "right: 20px;";

  var isOpen = false;

  var bubble = document.createElement("button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.style.cssText =
    "position: fixed; bottom: 20px; " + sideStyle +
    "width: 56px; height: 56px; border-radius: 50%; border: none; " +
    "background: " + brandColor + "; box-shadow: 0 4px 14px rgba(0,0,0,0.15); " +
    "cursor: pointer; z-index: 2147483000; display: flex; align-items: center; " +
    "justify-content: center; transition: transform 150ms ease;";
  bubble.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 4h16v12H7l-3 3V4z" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>';
  bubble.onmouseenter = function () { bubble.style.transform = "scale(1.06)"; };
  bubble.onmouseleave = function () { bubble.style.transform = "scale(1)"; };

  var frameWrapper = document.createElement("div");
  frameWrapper.style.cssText =
    "position: fixed; bottom: 88px; " + sideStyle +
    "width: 380px; max-width: calc(100vw - 40px); height: 600px; " +
    "max-height: calc(100vh - 120px); border-radius: 16px; overflow: hidden; " +
    "box-shadow: 0 12px 40px rgba(0,0,0,0.2); display: none; z-index: 2147483000; " +
    "background: white;";

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/widget/" + encodeURIComponent(botId);
  iframe.title = "Chat";
  iframe.style.cssText = "width: 100%; height: 100%; border: none;";
  // The widget page is served from our own origin and is meant to be
  // embedded anywhere — sandboxed but with what a real chat UI needs
  // (its own scripts, same-origin fetch back to our API, popups for any
  // future "open in new tab" link, and form submission for the message box).
  iframe.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-popups allow-forms"
  );

  frameWrapper.appendChild(iframe);

  bubble.addEventListener("click", function () {
    isOpen = !isOpen;
    frameWrapper.style.display = isOpen ? "block" : "none";
  });

  document.body.appendChild(bubble);
  document.body.appendChild(frameWrapper);
})();
