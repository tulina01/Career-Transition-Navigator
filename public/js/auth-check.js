document.addEventListener("DOMContentLoaded", () => {
    const authButtons = document.getElementById("authButtons")
    const userMenu = document.getElementById("userMenu")
    const userName = document.getElementById("userName")
    const logoutBtn = document.getElementById("logoutBtn")
  
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem("user"))
  
    if (user) {
      // User is logged in
      authButtons.classList.add("d-none")
      userMenu.classList.remove("d-none")
  
      // Set user name
      userName.textContent = user.name || user.email
  
      // Add logout functionality
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
          try {
            await fetch("/api/auth/logout", {
              method: "POST",
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
    } else {
      // User is not logged in
      authButtons.classList.remove("d-none")
      userMenu.classList.add("d-none")
    }
  
    // Add save buttons to career path cards if user is logged in
    if (user) {
      // Add event listener for when career paths are loaded
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            addSaveButtons()
          }
        })
      })
  
      // Start observing the career paths container
      const careerPaths = document.getElementById("careerPaths")
      if (careerPaths) {
        observer.observe(careerPaths, { childList: true, subtree: true })
      }
    }
  
    // Function to add save buttons to career path cards
    function addSaveButtons() {
      document.querySelectorAll(".career-path-card").forEach((card) => {
        // Check if save button already exists
        if (!card.querySelector(".save-btn")) {
          const saveBtn = document.createElement("button")
          saveBtn.className = "btn btn-outline-primary save-btn"
          saveBtn.innerHTML = '<i class="bi bi-bookmark"></i>'
          saveBtn.title = "Save to profile"
  
          saveBtn.addEventListener("click", async (e) => {
            e.stopPropagation() // Prevent card click
  
            try {
              // Show loading state
              saveBtn.disabled = true
              saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>'
  
              // Get career path data
              const careerTitle = decodeURIComponent(card.dataset.career || "")
  
              // Get description with fallback
              let description = ""
              const descriptionElement = card.querySelector(".card-text")
              if (descriptionElement) {
                description = descriptionElement.textContent || ""
              }
  
              // Get fit score with fallback
              let fitScore = 0
              const fitScoreElement = card.querySelector(".badge")
              if (fitScoreElement) {
                const fitScoreText = fitScoreElement.textContent || ""
                const match = fitScoreText.match(/(\d+)/)
                fitScore = match ? Number.parseInt(match[1], 10) : 0
              }
  
              // Get type with fallback
              let type = "same-field"
              const typeElement = card.querySelector(".career-type-badge")
              if (typeElement) {
                type = (typeElement.textContent || "").trim().toLowerCase().includes("same")
                  ? "same-field"
                  : "different-field"
              }
  
              // Get skill tags with fallback
              const skillElements = card.querySelectorAll(".skill-tag")
              const skillTags = skillElements ? Array.from(skillElements).map((tag) => tag.textContent || "") : []
  
              console.log("Saving career path:", {
                title: careerTitle,
                description: description.substring(0, 50) + "...",
                fitScore,
                type,
                transferableSkills: skillTags.length,
              })
  
              const response = await fetch("/api/profile/career-paths", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  careerPath: {
                    title: careerTitle,
                    description,
                    fitScore,
                    type,
                    transferableSkills: skillTags,
                  },
                }),
                credentials: "include", // Important: include cookies
              })
  
              const data = await response.json()
  
              if (!response.ok) {
                throw new Error(data.error || data.message || "Failed to save career path")
              }
  
              // Change button to saved state
              saveBtn.disabled = false
              saveBtn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i>'
              saveBtn.classList.remove("btn-outline-primary")
              saveBtn.classList.add("btn-success")
              saveBtn.title = "Saved to profile"
  
              // Show toast notification
              const toastContainer = document.getElementById("toastContainer")
              if (toastContainer) {
                const toast = document.createElement("div")
                toast.className = "toast toast-success show"
                toast.innerHTML = `
                  <div class="toast-header">
                    <strong class="me-auto">Success</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                  </div>
                  <div class="toast-body">
                    Career path saved to your profile!
                  </div>
                `
  
                toastContainer.appendChild(toast)
  
                // Auto-remove after 3 seconds
                setTimeout(() => {
                  toast.classList.remove("show")
                  setTimeout(() => {
                    toastContainer.removeChild(toast)
                  }, 300)
                }, 3000)
              }
            } catch (error) {
              console.error("Error saving career path:", error)
  
              // Reset button state
              saveBtn.disabled = false
              saveBtn.innerHTML = '<i class="bi bi-bookmark"></i>'
  
              // Show error toast
              const toastContainer = document.getElementById("toastContainer")
              if (toastContainer) {
                const toast = document.createElement("div")
                toast.className = "toast toast-error show"
                toast.innerHTML = `
                  <div class="toast-header">
                    <strong class="me-auto">Error</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                  </div>
                  <div class="toast-body">
                    ${error.message || "Failed to save career path. Please try again."}
                  </div>
                `
  
                toastContainer.appendChild(toast)
  
                // Auto-remove after 3 seconds
                setTimeout(() => {
                  toast.classList.remove("show")
                  setTimeout(() => {
                    toastContainer.removeChild(toast)
                  }, 300)
                }, 3000)
              }
            }
          })
  
          card.appendChild(saveBtn)
        }
      })
  
      // Also add save buttons to transition steps
      document.querySelectorAll(".transition-step").forEach((step) => {
        // Check if save button already exists
        if (!step.querySelector(".save-btn") && document.getElementById("selectedCareerTitle")) {
          const saveBtn = document.createElement("button")
          saveBtn.className = "btn btn-sm btn-outline-primary save-btn"
          saveBtn.innerHTML = '<i class="bi bi-bookmark"></i>'
          saveBtn.title = "Save to profile"
  
          saveBtn.addEventListener("click", async (e) => {
            e.stopPropagation()
  
            const careerTitle = document
              .getElementById("selectedCareerTitle")
              .textContent.replace("Transition Plan: ", "")
            const planElement = document.getElementById("transitionPlan")
  
            // Extract plan data
            const overview = planElement.querySelector(".plan-overview p").textContent
            const transitionType = planElement
              .querySelector(".career-type-badge")
              .textContent.trim()
              .toLowerCase()
              .includes("same")
              ? "same-field"
              : "different-field"
  
            const steps = Array.from(planElement.querySelectorAll(".transition-step")).map((step) => {
              const title = step.querySelector("h4").textContent.replace(/^\d+\.\s+/, "")
              const description = step.querySelector("p").textContent
  
              const resources = []
              const resourceLinks = step.querySelectorAll(".resources a")
              if (resourceLinks.length) {
                resourceLinks.forEach((link) => {
                  resources.push({
                    title: link.textContent.trim().replace(" ", ""),
                    url: link.href,
                  })
                })
              }
  
              return { title, description, resources }
            })
  
            const plan = {
              overview,
              transitionType,
              steps,
            }
  
            try {
              const response = await fetch("/api/profile/transition-plans", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  careerTitle,
                  plan,
                }),
              })
  
              if (!response.ok) {
                throw new Error("Failed to save transition plan")
              }
  
              // Change button to saved state
              saveBtn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i>'
              saveBtn.classList.remove("btn-outline-primary")
              saveBtn.classList.add("btn-success")
              saveBtn.title = "Saved to profile"
  
              // Show toast notification
              const toastContainer = document.getElementById("toastContainer")
              if (toastContainer) {
                const toast = document.createElement("div")
                toast.className = "toast toast-success show"
                toast.innerHTML = `
                  <div class="toast-header">
                    <strong class="me-auto">Success</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                  </div>
                  <div class="toast-body">
                    Transition plan saved to your profile!
                  </div>
                `
  
                toastContainer.appendChild(toast)
  
                // Auto-remove after 3 seconds
                setTimeout(() => {
                  toast.classList.remove("show")
                  setTimeout(() => {
                    toastContainer.removeChild(toast)
                  }, 300)
                }, 3000)
              }
            } catch (error) {
              console.error("Error saving transition plan:", error)
  
              // Show error toast
              const toastContainer = document.getElementById("toastContainer")
              if (toastContainer) {
                const toast = document.createElement("div")
                toast.className = "toast toast-error show"
                toast.innerHTML = `
                  <div class="toast-header">
                    <strong class="me-auto">Error</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                  </div>
                  <div class="toast-body">
                    Failed to save transition plan. Please try again.
                  </div>
                `
  
                toastContainer.appendChild(toast)
  
                // Auto-remove after 3 seconds
                setTimeout(() => {
                  toast.classList.remove("show")
                  setTimeout(() => {
                    toastContainer.removeChild(toast)
                  }, 300)
                }, 3000)
              }
            }
          })
  
          step.appendChild(saveBtn)
        }
      })
    }
  })
  