document.addEventListener("DOMContentLoaded", () => {
  // Form elements
  const loginForm = document.getElementById("loginForm")
  const registerForm = document.getElementById("registerForm")
  const toastContainer = document.querySelector(".toast-container")

  // Toggle password visibility
  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", function () {
      const input = this.previousElementSibling
      const icon = this.querySelector("i")

      if (input.type === "password") {
        input.type = "text"
        icon.classList.remove("bi-eye")
        icon.classList.add("bi-eye-slash")
      } else {
        input.type = "password"
        icon.classList.remove("bi-eye-slash")
        icon.classList.add("bi-eye")
      }
    })
  })

  // Password strength meter
  const passwordInput = document.getElementById("password")
  const passwordStrength = document.getElementById("passwordStrength")
  const strengthBar = passwordStrength?.querySelector(".progress-bar")
  const strengthText = document.getElementById("strengthText")

  if (passwordInput && passwordStrength) {
    passwordInput.addEventListener("input", function () {
      const password = this.value
      let strength = 0
      let status = ""

      passwordStrength.classList.remove("d-none")

      // Length check
      if (password.length >= 8) strength += 25

      // Character checks
      if (password.match(/[a-z]+/)) strength += 25
      if (password.match(/[A-Z]+/)) strength += 25
      if (password.match(/[0-9]+/)) strength += 25
      if (password.match(/[^a-zA-Z0-9]+/)) strength += 25

      // Cap at 100
      strength = Math.min(100, strength)

      // Update UI
      if (strengthBar) {
        strengthBar.style.width = `${strength}%`

        if (strength < 25) {
          strengthBar.className = "progress-bar bg-danger"
          status = "Very Weak"
        } else if (strength < 50) {
          strengthBar.className = "progress-bar bg-warning"
          status = "Weak"
        } else if (strength < 75) {
          strengthBar.className = "progress-bar bg-info"
          status = "Good"
        } else {
          strengthBar.className = "progress-bar bg-success"
          status = "Strong"
        }

        if (strengthText) {
          strengthText.textContent = status
        }
      }
    })
  }

  // Show toast notification
  function showToast(type, title, message) {
    const toast = document.createElement("div")
    toast.className = `toast toast-${type} show`
    toast.innerHTML = `
      <div class="toast-header">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `

    toastContainer.appendChild(toast)

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove("show")
      setTimeout(() => {
        toastContainer.removeChild(toast)
      }, 300)
    }, 5000)

    // Close button functionality
    toast.querySelector(".btn-close").addEventListener("click", () => {
      toast.classList.remove("show")
      setTimeout(() => {
        toastContainer.removeChild(toast)
      }, 300)
    })
  }

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const email = document.getElementById("email").value
      const password = document.getElementById("password").value

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Login failed")
        }

        // Store user info in localStorage
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: data._id,
            name: data.name,
            email: data.email,
          }),
        )

        // Show success message
        showToast("success", "Success", "Logged in successfully!")

        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = "index.html"
        }, 1000)
      } catch (error) {
        showToast("error", "Error", error.message)
      }
    })
  }

  // Handle register form submission
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const name = document.getElementById("name").value
      const email = document.getElementById("email").value
      const password = document.getElementById("password").value
      const confirmPassword = document.getElementById("confirmPassword").value

      // Validate passwords match
      if (password !== confirmPassword) {
        showToast("error", "Error", "Passwords do not match")
        return
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password }),
          credentials: "include",
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Registration failed")
        }

        // Store user info in localStorage
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: data._id,
            name: data.name,
            email: data.email,
          }),
        )

        // Show success message
        showToast("success", "Success", "Account created successfully!")

        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = "index.html"
        }, 1500)
      } catch (error) {
        showToast("error", "Error", error.message)
      }
    })
  }
})
