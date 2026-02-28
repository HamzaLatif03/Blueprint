/**
 * Blueprint - university opportunities, mock interviews, job tracking.
 */

(function () {
  "use strict";

  let currentInterviewQuestion = "";

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // ---- Claude status (sidebar) ----
  var claudeStatus = document.getElementById("claude-status");
  if (claudeStatus) {
    fetch("/api/status")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        claudeStatus.textContent = data.claude_available ? "✓ Claude active" : "Claude offline (set ANTHROPIC_API_KEY in .env)";
        claudeStatus.className = "sidebar-status " + (data.claude_available ? "sidebar-status-on" : "sidebar-status-off");
      })
      .catch(function () {
        claudeStatus.textContent = "Status unknown";
      });
  }

  // ---- Tabs ----
  document.querySelectorAll(".nav-item").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var tab = el.getAttribute("data-tab");
      if (!tab) return;
      if (tab !== "interview" && typeof stopInterviewStream === "function") stopInterviewStream();
      document.querySelectorAll(".nav-item").forEach(function (n) {
        n.classList.remove("active");
      });
      el.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach(function (p) {
        p.classList.remove("active");
      });
      var panel = document.getElementById("tab-" + tab);
      if (panel) panel.classList.add("active");
    });
  });

  // ---- University opportunities ----
  var programmesSearchBtn = document.getElementById("programmes-search-btn");
  var programmesList = document.getElementById("programmes-list");

  if (programmesSearchBtn) {
    programmesSearchBtn.addEventListener("click", function () {
      var interests = (document.getElementById("programmes-interests") && document.getElementById("programmes-interests").value) || "";
      var background = (document.getElementById("programmes-background") && document.getElementById("programmes-background").value) || "";
      var degreeType = (document.getElementById("programmes-degree-type") && document.getElementById("programmes-degree-type").value) || "";
      if (!interests.trim()) return;
      fetch("/api/programmes/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: interests, background: background, degree_type: degreeType }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var programmes = data.programmes || [];
          if (!programmesList) return;
          if (programmes.length === 0) {
            programmesList.innerHTML = "<p class=\"placeholder\">No programmes found. Try different keywords.</p>";
            return;
          }
          programmesList.innerHTML = programmes
            .map(function (p) {
              return (
                "<div class=\"match-item\">" +
                "<span class=\"match-icon\">" + (p.degree_type === "PhD" ? "PhD" : "MSc") + "</span>" +
                "<div class=\"match-info\">" +
                "<h4>" + escapeHtml(p.name) + "</h4>" +
                "<p>" + escapeHtml(p.institution) + " · " + escapeHtml(p.focus) + " · " + escapeHtml(p.location) + "</p>" +
                "</div>" +
                "<span class=\"match-pct\">" + p.match_pct + "% Match</span>" +
                "</div>"
              );
            })
            .join("");
        })
        .catch(function (err) {
          console.error(err);
          if (programmesList) programmesList.innerHTML = "<p class=\"placeholder\">Error loading programmes.</p>";
        });
    });
  }

  var programmesInterests = document.getElementById("programmes-interests");
  if (programmesInterests) {
    programmesInterests.addEventListener("keydown", function (e) {
      if (e.key === "Enter") programmesSearchBtn && programmesSearchBtn.click();
    });
  }

  // ---- Mock interviews (self-view + record + speech-to-text) ----
  var interviewGetBtn = document.getElementById("interview-get-question");
  var interviewQuestionBox = document.getElementById("interview-question-box");
  var interviewAnswer = document.getElementById("interview-answer");
  var interviewSubmitBtn = document.getElementById("interview-submit-answer");
  var interviewFeedback = document.getElementById("interview-feedback");
  var selfView = document.getElementById("interview-self-view");
  var placeholderView = document.getElementById("interview-placeholder");
  var recordingDot = document.getElementById("interview-recording-dot");
  var startCameraBtn = document.getElementById("interview-start-camera");
  var startSpeakBtn = document.getElementById("interview-start-speak");
  var stopSpeakBtn = document.getElementById("interview-stop-speak");

  var interviewStream = null;
  var interviewRecognition = null;
  var interviewTranscriptParts = [];
  var SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  function stopInterviewStream() {
    if (interviewStream) {
      interviewStream.getTracks().forEach(function (t) { t.stop(); });
      interviewStream = null;
    }
    if (selfView && selfView.srcObject) {
      selfView.srcObject = null;
    }
    if (placeholderView) placeholderView.classList.remove("hidden");
    if (startSpeakBtn) startSpeakBtn.disabled = true;
    if (startCameraBtn) startCameraBtn.textContent = "Start camera";
  }

  if (startCameraBtn && selfView) {
    startCameraBtn.addEventListener("click", function () {
      if (interviewStream) {
        stopInterviewStream();
        startCameraBtn.textContent = "Start camera";
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function (stream) {
          interviewStream = stream;
          selfView.srcObject = stream;
          selfView.play();
          placeholderView.classList.add("hidden");
          startSpeakBtn.disabled = false;
          startCameraBtn.textContent = "Stop camera";
        })
        .catch(function (err) {
          console.error(err);
          alert("Could not access camera/microphone. Use HTTPS or localhost and allow permissions.");
        });
    });
  }

  function startSpeaking() {
    if (!interviewStream || !SpeechRecognitionAPI) {
      if (!SpeechRecognitionAPI) alert("Speech recognition is not supported in this browser (try Chrome). You can still type your answer.");
      return;
    }
    interviewTranscriptParts = [];
    try {
      interviewRecognition = new SpeechRecognitionAPI();
      interviewRecognition.continuous = true;
      interviewRecognition.interimResults = true;
      interviewRecognition.lang = "en-GB";
      interviewRecognition.onresult = function (e) {
        var last = e.results.length - 1;
        var transcript = e.results[last][0].transcript;
        if (e.results[last].isFinal) {
          interviewTranscriptParts.push(transcript);
        }
      };
      interviewRecognition.onerror = function (e) {
        if (e.error !== "no-speech") console.error(e.error);
      };
      interviewRecognition.start();
      if (recordingDot) recordingDot.classList.remove("hidden");
      if (startSpeakBtn) startSpeakBtn.disabled = true;
      if (stopSpeakBtn) stopSpeakBtn.disabled = false;
    } catch (err) {
      console.error(err);
    }
  }

  function stopSpeaking() {
    if (interviewRecognition) {
      try {
        interviewRecognition.stop();
      } catch (e) {}
      interviewRecognition = null;
    }
    if (recordingDot) recordingDot.classList.add("hidden");
    if (startSpeakBtn) startSpeakBtn.disabled = interviewStream ? false : true;
    if (stopSpeakBtn) stopSpeakBtn.disabled = true;
    var transcript = interviewTranscriptParts.join(" ").trim();
    if (transcript && interviewAnswer) {
      var existing = interviewAnswer.value.trim();
      interviewAnswer.value = existing ? existing + " " + transcript : transcript;
    }
  }

  if (startSpeakBtn) startSpeakBtn.addEventListener("click", startSpeaking);
  if (stopSpeakBtn) stopSpeakBtn.addEventListener("click", stopSpeaking);

  if (interviewGetBtn) {
    interviewGetBtn.addEventListener("click", function () {
      var role = (document.getElementById("interview-role") && document.getElementById("interview-role").value) || "";
      fetch("/api/interview/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          currentInterviewQuestion = data.question || "";
          if (interviewQuestionBox) {
            interviewQuestionBox.innerHTML = "<p class=\"interview-question-text\">" + escapeHtml(currentInterviewQuestion) + "</p>";
          }
          if (interviewFeedback) {
            interviewFeedback.innerHTML = "<p class=\"placeholder\">Submit your answer and click Get feedback.</p>";
          }
        })
        .catch(function (err) {
          console.error(err);
        });
    });
  }

  if (interviewSubmitBtn && interviewFeedback) {
    interviewSubmitBtn.addEventListener("click", function () {
      var answer = (interviewAnswer && interviewAnswer.value) || "";
      if (!currentInterviewQuestion) {
        interviewFeedback.innerHTML = "<p class=\"placeholder\">Get a question first.</p>";
        return;
      }
      var role = (document.getElementById("interview-role") && document.getElementById("interview-role").value) || "";
      fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInterviewQuestion, answer: answer, role: role }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          interviewFeedback.innerHTML =
            "<p class=\"feedback-score\">Score: <strong>" +
            (data.score != null ? data.score : "—") +
            "/10</strong></p>" +
            "<p>" +
            escapeHtml(data.feedback_text || "") +
            "</p>" +
            (data.strengths && data.strengths.length
              ? "<h4>Strengths</h4><ul><li>" + data.strengths.map(function (s) { return escapeHtml(s); }).join("</li><li>") + "</li></ul>"
              : "") +
            (data.improvements && data.improvements.length
              ? "<h4>Improvements</h4><ul><li>" + data.improvements.map(function (s) { return escapeHtml(s); }).join("</li><li>") + "</li></ul>"
              : "");
        })
        .catch(function (err) {
          console.error(err);
          interviewFeedback.innerHTML = "<p class=\"placeholder\">Error loading feedback.</p>";
        });
    });
  }

  // ---- Job tracking ----
  function loadApplications() {
    fetch("/api/applications")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var list = document.getElementById("application-list");
        if (!list) return;
        var apps = data.applications || [];
        if (apps.length === 0) {
          list.innerHTML = "<p class=\"placeholder\">No applications yet. Add one above.</p>";
          return;
        }
        list.innerHTML = apps
          .map(function (a) {
            return (
              "<div class=\"application-item\" data-id=\"" +
              escapeHtml(a.id) +
              "\">" +
              "<span class=\"app-company\">" +
              escapeHtml(a.company) +
              "</span>" +
              "<span class=\"app-role\">" +
              escapeHtml(a.role) +
              "</span>" +
              "<span class=\"app-status\">" +
              escapeHtml(a.status) +
              "</span>" +
              "<button type=\"button\" class=\"btn-delete\" data-id=\"" +
              escapeHtml(a.id) +
              "\" aria-label=\"Remove\">×</button>" +
              "</div>"
            );
          })
          .join("");
        list.querySelectorAll(".btn-delete").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-id");
            fetch("/api/applications/" + id, { method: "DELETE" })
              .then(function () {
                loadApplications();
              });
          });
        });
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  var appAddBtn = document.getElementById("app-add-btn");
  if (appAddBtn) {
    appAddBtn.addEventListener("click", function () {
      var company = (document.getElementById("app-company") && document.getElementById("app-company").value) || "";
      var role = (document.getElementById("app-role") && document.getElementById("app-role").value) || "";
      var status = (document.getElementById("app-status") && document.getElementById("app-status").value) || "Applied";
      if (!company.trim() || !role.trim()) return;
      fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company, role: role, status: status }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function () {
          if (document.getElementById("app-company")) document.getElementById("app-company").value = "";
          if (document.getElementById("app-role")) document.getElementById("app-role").value = "";
          loadApplications();
        })
        .catch(function (err) {
          console.error(err);
        });
    });
  }
  loadApplications();
})();
