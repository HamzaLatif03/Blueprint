/**
 * Blueprint - Sign in / Sign up (localStorage, no Firebase).
 */
(function () {
  "use strict";

  var USERS_KEY = "blueprint_users";
  var CURRENT_USER_KEY = "blueprint_current_user";

  var authFormWrap = document.getElementById("auth-form-wrap");
  var authForm = document.getElementById("auth-form");
  var authEmail = document.getElementById("auth-email");
  var authPassword = document.getElementById("auth-password");
  var authError = document.getElementById("auth-error");
  var authSubmit = document.getElementById("auth-submit");
  var mainHeader = document.getElementById("main-header");
  var userMenuIcon = document.getElementById("user-menu-icon");
  var userMenuBtn = document.getElementById("user-menu-btn");
  var userDropdown = document.getElementById("user-dropdown");

  var authMode = "signin";

  function getUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {}
  }

  function getCurrentUser() {
    try {
      var email = localStorage.getItem(CURRENT_USER_KEY);
      return email || null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(email) {
    try {
      if (email) localStorage.setItem(CURRENT_USER_KEY, email);
      else localStorage.removeItem(CURRENT_USER_KEY);
    } catch (e) {}
  }

  function showError(msg) {
    if (!authError) return;
    authError.textContent = msg || "";
    authError.classList.toggle("hidden", !msg);
  }

  function setAuthUI(userEmail) {
    if (authFormWrap) authFormWrap.classList.toggle("hidden", !!userEmail);
    if (mainHeader) mainHeader.classList.toggle("hidden", !userEmail);
    if (userEmail && userMenuIcon) {
      userMenuIcon.textContent = (userEmail.charAt(0) || "?").toUpperCase();
    }
    setMainAppAccess(!!userEmail);
    if (!userEmail && userDropdown) userDropdown.classList.add("hidden");
  }

  function closeUserDropdown() {
    if (userDropdown) userDropdown.classList.add("hidden");
    if (userMenuBtn) userMenuBtn.setAttribute("aria-expanded", "false");
  }

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = !userDropdown.classList.contains("hidden");
      if (isOpen) {
        userDropdown.classList.add("hidden");
        userMenuBtn.setAttribute("aria-expanded", "false");
      } else {
        userDropdown.classList.remove("hidden");
        userMenuBtn.setAttribute("aria-expanded", "true");
      }
    });
    userDropdown.querySelectorAll("[data-action]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var action = el.getAttribute("data-action");
        if (action === "profile") {
          document.querySelectorAll(".nav-item").forEach(function (n) { n.classList.remove("active"); });
          document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
          var profilePanel = document.getElementById("tab-profile");
          if (profilePanel) {
            profilePanel.classList.add("active");
            window.dispatchEvent(new CustomEvent("blueprint-show-profile"));
          }
        } else if (action === "logout") {
          setCurrentUser(null);
          setAuthUI(null);
          document.querySelectorAll(".nav-item").forEach(function (n) { n.classList.remove("active"); });
          document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
          var authPanel = document.getElementById("tab-auth");
          if (authPanel) authPanel.classList.add("active");
        }
        closeUserDropdown();
      });
    });
    userDropdown.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    document.addEventListener("click", function () {
      closeUserDropdown();
    });
  }

  function setMainAppAccess(signedIn) {
    var protectedNav = document.querySelectorAll(".nav-item-protected");
    var protectedPanels = document.querySelectorAll(".tab-panel-protected");
    var authPanel = document.getElementById("tab-auth");
    if (signedIn) {
      protectedNav.forEach(function (el) { el.classList.remove("hidden"); });
      protectedPanels.forEach(function (el) { el.classList.remove("hidden"); });
    } else {
      protectedNav.forEach(function (el) { el.classList.add("hidden"); });
      protectedPanels.forEach(function (el) { el.classList.add("hidden"); });
      document.querySelectorAll(".nav-item").forEach(function (n) { n.classList.remove("active"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
      if (authPanel) authPanel.classList.add("active");
    }
  }

  if (authForm) {
    authForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (authEmail && authEmail.value ? authEmail.value.trim() : "") || "";
      var password = (authPassword && authPassword.value ? authPassword.value : "") || "";
      if (!email || !password) {
        showError("Enter email and password.");
        return;
      }
      showError("");
      authSubmit.disabled = true;

      if (authMode === "signup") {
        var users = getUsers();
        if (users.some(function (u) { return (u.email || "").toLowerCase() === email.toLowerCase(); })) {
          showError("An account with this email already exists. Sign in instead.");
          authSubmit.disabled = false;
          return;
        }
        users.push({ email: email, password: password });
        saveUsers(users);
        setCurrentUser(email);
        setAuthUI(email);
        authSubmit.disabled = false;
        var uniNav = document.querySelector('.nav-item[data-tab="uni"]');
        if (uniNav) uniNav.click();
      } else {
        var users = getUsers();
        var match = users.find(function (u) { return (u.email || "").toLowerCase() === email.toLowerCase() && u.password === password; });
        if (!match) {
          showError("Invalid email or password.");
          authSubmit.disabled = false;
          return;
        }
        setCurrentUser(email);
        setAuthUI(email);
        authSubmit.disabled = false;
        var uniNav = document.querySelector('.nav-item[data-tab="uni"]');
        if (uniNav) uniNav.click();
      }
    });
  }

  document.querySelectorAll(".auth-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      authMode = tab.getAttribute("data-mode") || "signin";
      document.querySelectorAll(".auth-tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      if (authSubmit) authSubmit.textContent = authMode === "signup" ? "Create account" : "Sign in";
      showError("");
    });
  });

  var current = getCurrentUser();
  setAuthUI(current);
  if (current) {
    var authPanel = document.getElementById("tab-auth");
    if (authPanel && authPanel.classList.contains("active")) {
      var uniNav = document.querySelector('.nav-item[data-tab="uni"]');
      if (uniNav) uniNav.click();
    }
  }
})();
