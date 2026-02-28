/**
 * Blueprint - Profile: universities and CV preview (localStorage, no Firebase).
 */
(function () {
  "use strict";

  var PROFILE_STORAGE_KEY = "blueprint_profile_universities";
  var CURRENT_USER_KEY = "blueprint_current_user";

  function getUid() {
    try {
      return localStorage.getItem(CURRENT_USER_KEY);
    } catch (e) {
      return null;
    }
  }

  function getUniversities() {
    var uid = getUid();
    if (!uid) return [];
    try {
      var raw = localStorage.getItem(PROFILE_STORAGE_KEY + "_" + uid);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUniversities(list) {
    var uid = getUid();
    if (!uid) return;
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY + "_" + uid, JSON.stringify(list));
    } catch (e) {}
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function renderUniversities() {
    var listEl = document.getElementById("profile-universities-list");
    if (!listEl) return;
    var list = getUniversities();
    if (list.length === 0) {
      listEl.innerHTML = "<li class=\"placeholder\">No universities added yet. Add one above.</li>";
      return;
    }
    listEl.innerHTML = list
      .map(function (u, i) {
        var end = (u.end || "").toString().toLowerCase() === "present" ? "Present" : escapeHtml(u.end || "—");
        return (
          "<li class=\"profile-list-item\">" +
          "<span class=\"profile-uni-name\">" + escapeHtml(u.name) + "</span> " +
          "<span class=\"profile-uni-dates\">" + escapeHtml(u.start || "—") + " – " + end + "</span> " +
          "<button type=\"button\" class=\"btn-delete profile-uni-remove\" data-index=\"" + i + "\" aria-label=\"Remove\">×</button>" +
          "</li>"
        );
      })
      .join("");
    listEl.querySelectorAll(".profile-uni-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var index = parseInt(btn.getAttribute("data-index"), 10);
        var list = getUniversities();
        list.splice(index, 1);
        saveUniversities(list);
        renderUniversities();
      });
    });
  }

  var addBtn = document.getElementById("profile-uni-add");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      var nameEl = document.getElementById("profile-uni-name");
      var startEl = document.getElementById("profile-uni-start");
      var endEl = document.getElementById("profile-uni-end");
      var name = (nameEl && nameEl.value) ? nameEl.value.trim() : "";
      if (!name) return;
      var start = (startEl && startEl.value) ? startEl.value.trim() : "";
      var end = (endEl && endEl.value) ? endEl.value.trim() : "Present";
      var list = getUniversities();
      list.push({ name: name, start: start || undefined, end: end || "Present" });
      saveUniversities(list);
      renderUniversities();
      if (nameEl) nameEl.value = "";
      if (startEl) startEl.value = "";
      if (endEl) endEl.value = "Present";
    });
  }

  function setCvStatus(msg) {
    var el = document.getElementById("profile-cv-status");
    if (!el) return;
    el.innerHTML = msg;
    el.classList.toggle("hidden", !msg);
  }

  function setCvPreview(blobUrl, isPdf) {
    var el = document.getElementById("profile-cv-preview");
    if (!el) return;
    if (!blobUrl) {
      el.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    el.classList.remove("hidden");
    if (isPdf) {
      el.innerHTML = "<iframe src=\"" + escapeHtml(blobUrl) + "#toolbar=0\" title=\"CV preview\"></iframe>";
    } else {
      el.innerHTML = "<p class=\"profile-cv-preview-note\">Preview is available for PDF files. Your file is not saved.</p>";
    }
  }

  var uploadBtn = document.getElementById("profile-cv-upload");
  var cvInput = document.getElementById("profile-cv-input");
  if (uploadBtn && cvInput) {
    cvInput.addEventListener("change", function () {
      var file = cvInput.files && cvInput.files[0];
      if (!file) {
        setCvStatus("");
        setCvPreview(null);
        return;
      }
      var isPdf = (file.name.split(".").pop() || "").toLowerCase() === "pdf";
      setCvStatus("Preview: " + escapeHtml(file.name) + " (not saved)");
      if (isPdf) {
        var url = URL.createObjectURL(file);
        setCvPreview(url, true);
      } else {
        setCvPreview(null);
      }
    });
    uploadBtn.addEventListener("click", function () {
      cvInput.click();
    });
  }

  function onAuthOrTab() {
    if (getUid()) {
      renderUniversities();
    }
  }

  window.addEventListener("blueprint-show-profile", function () {
    onAuthOrTab();
  });

  onAuthOrTab();
})();
