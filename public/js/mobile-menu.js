document.addEventListener("DOMContentLoaded", () => {
    // Mobile menu elements
    const mobileMenuToggle = document.getElementById("mobileMenuToggle")
    const mobileMenu = document.getElementById("mobileMenu")
    const mobileMenuClose = document.getElementById("mobileMenuClose")
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay")
    const mobileAuthButtons = document.getElementById("mobileAuthButtons")
    const mobileUserMenu = document.getElementById("mobileUserMenu")
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn")
  
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem("user"))
  
    // Show appropriate mobile menu items based on login status
    if (user) {
      if (mobileUserMenu) mobileUserMenu.classList.remove("d-none")
      if (mobileAuthButtons) mobileAuthButtons.classList.add("d-none")
    } else {
      if (mobileUserMenu) mobileUserMenu.classList.add("d-none")
      if (mobileAuthButtons) mobileAuthButtons.classList.remove("d-none")
    }
  
    // Toggle mobile menu
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener("click", () => {
        mobileMenu.classList.add("active")
        mobileMenuOverlay.classList.add("active")
        document.body.style.overflow = "hidden" // Prevent scrolling
      })
    }
  
    // Close mobile menu
    function closeMobileMenu() {
      mobileMenu.classList.remove("active")
      mobileMenuOverlay.classList.remove("active")
      document.body.style.overflow = "" // Allow scrolling
    }
  
    if (mobileMenuClose) {
      mobileMenuClose.addEventListener("click", closeMobileMenu)
    }
  
    if (mobileMenuOverlay) {
      mobileMenuOverlay.addEventListener("click", closeMobileMenu)
    }
  
    // Mobile logout functionality
    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener("click", async () => {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          })
  
          // Clear user from localStorage
          localStorage.removeItem("user")
  
          // Redirect to home page
          window.location.href = "index.html"
        } catch (error) {
          console.error("Logout error:", error)
  
          // If API call fails, still clear localStorage and redirect
          localStorage.removeItem("user")
          window.location.href = "index.html"
        }
      })
    }
  })
  