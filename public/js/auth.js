document.addEventListener("DOMContentLoaded", () => {
    // Form elements
    const loginForm = document.getElementById("loginForm")
    const registerForm = document.getElementById("registerForm")
    const toastContainer = document.getElementById("toastContainer")
  
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
  
          // Redirect to home page
          window.location.href = "index.html"
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
  
          // Show success message and redirect
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
  