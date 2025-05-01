document.addEventListener("DOMContentLoaded", () => {
    // Form elements
    const resumeForm = document.getElementById("resumeForm")
    const reasonsForm = document.getElementById("reasonsForm")
    const reasonOther = document.getElementById("reasonOther")
    const otherReasonContainer = document.getElementById("otherReasonContainer")
    const backToPathsBtn = document.getElementById("backToPathsBtn")
  
    // Step containers
    const step1 = document.getElementById("step1")
    const step2 = document.getElementById("step2")
    const step3 = document.getElementById("step3")
    const step4 = document.getElementById("step4")
  
    // Progress and loading elements
    const uploadProgress = document.getElementById("uploadProgress")
    const progressBar = uploadProgress.querySelector(".progress-bar")
    const loadingRecommendations = document.getElementById("loadingRecommendations")
    const careerPaths = document.getElementById("careerPaths")
    const loadingPlan = document.getElementById("loadingPlan")
    const transitionPlan = document.getElementById("transitionPlan")
    const selectedCareerTitle = document.getElementById("selectedCareerTitle")
  
    // Store parsed resume data
    let resumeData = null
  
    // Handle resume upload
    resumeForm.addEventListener("submit", (e) => {
      e.preventDefault()
  
      const formData = new FormData(resumeForm)
      const fileInput = document.getElementById("resumeFile")
  
      if (!fileInput.files.length) {
        alert("Please select a file to upload")
        return
      }
  
      // Show progress bar
      uploadProgress.classList.remove("d-none")
  
      // Simulate upload progress (in a real app, this would be actual upload progress)
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        progressBar.style.width = `${progress}%`
  
        if (progress >= 100) {
          clearInterval(interval)
  
          // Send the file to the server
          fetch("/api/parse-resume", {
            method: "POST",
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Network response was not ok")
              }
              return response.json()
            })
            .then((data) => {
              console.log("Parsed resume data:", data)
              resumeData = data
  
              // Move to step 2
              step1.classList.remove("active")
              step1.classList.add("d-none")
              step2.classList.remove("d-none")
              step2.classList.add("active")
            })
            .catch((error) => {
              console.error("Error parsing resume:", error)
              alert("Error parsing resume. Please try again.")
              uploadProgress.classList.add("d-none")
              progressBar.style.width = "0%"
            })
        }
      }, 200)
    })
  
    // Toggle "Other" reason text field
    reasonOther.addEventListener("change", function () {
      if (this.checked) {
        otherReasonContainer.classList.remove("d-none")
      } else {
        otherReasonContainer.classList.add("d-none")
      }
    })
  
    // Handle reasons form submission
    reasonsForm.addEventListener("submit", (e) => {
      e.preventDefault()
  
      // Get selected reasons
      const selectedReasons = Array.from(document.querySelectorAll('input[name="reasons"]:checked')).map((checkbox) => {
        if (checkbox.id === "reasonOther") {
          return document.getElementById("otherReason").value
        }
        return checkbox.value
      })
  
      if (selectedReasons.length === 0) {
        alert("Please select at least one reason for career change")
        return
      }
  
      // Move to step 3
      step2.classList.remove("active")
      step2.classList.add("d-none")
      step3.classList.remove("d-none")
      step3.classList.add("active")
  
      // Request career recommendations
      fetch("/api/career-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData,
          reasons: selectedReasons,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok")
          }
          return response.json()
        })
        .then((data) => {
          // Hide loading, show career paths
          loadingRecommendations.classList.add("d-none")
          careerPaths.classList.remove("d-none")
  
          // Display career paths
          displayCareerPaths(data.careerPaths)
        })
        .catch((error) => {
          console.error("Error getting career recommendations:", error)
          loadingRecommendations.innerHTML = `
          <div class="alert alert-danger">
            Error getting career recommendations. Please try again.
          </div>
          <button class="btn btn-primary" onclick="location.reload()">Start Over</button>
        `
        })
    })
  
    // Display career paths
    function displayCareerPaths(paths) {
      careerPaths.innerHTML = ""
  
      if (!paths || paths.length === 0) {
        careerPaths.innerHTML = `
          <div class="alert alert-info">
            No career paths found. Please try again with different information.
          </div>
          <button class="btn btn-primary" onclick="location.reload()">Start Over</button>
        `
        return
      }
  
      const pathsHTML = paths
        .map(
          (path, index) => `
        <div class="card career-path-card mb-3" data-career="${encodeURIComponent(path.title)}">
          <div class="card-body">
            <h3 class="card-title">${path.title}</h3>
            <p class="card-text">${path.description}</p>
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-primary">${path.fitScore}% Match</span>
              <button class="btn btn-outline-primary btn-sm">View Transition Plan</button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
  
      careerPaths.innerHTML = pathsHTML
  
      // Add click event to career path cards
      document.querySelectorAll(".career-path-card").forEach((card) => {
        card.addEventListener("click", function () {
          const careerTitle = decodeURIComponent(this.dataset.career)
          getTransitionPlan(careerTitle)
        })
      })
    }
  
    // Get transition plan for selected career
    function getTransitionPlan(careerTitle) {
      // Move to step 4
      step3.classList.remove("active")
      step3.classList.add("d-none")
      step4.classList.remove("d-none")
      step4.classList.add("active")
  
      // Update title
      selectedCareerTitle.textContent = `Transition Plan: ${careerTitle}`
  
      // Show loading, hide plan
      loadingPlan.classList.remove("d-none")
      transitionPlan.classList.add("d-none")
  
      // Request transition plan
      fetch("/api/transition-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData,
          careerTitle,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok")
          }
          return response.json()
        })
        .then((data) => {
          // Hide loading, show plan
          loadingPlan.classList.add("d-none")
          transitionPlan.classList.remove("d-none")
  
          // Display transition plan
          displayTransitionPlan(data.plan)
        })
        .catch((error) => {
          console.error("Error getting transition plan:", error)
          loadingPlan.innerHTML = `
          <div class="alert alert-danger">
            Error getting transition plan. Please try again.
          </div>
          <button class="btn btn-primary" onclick="location.reload()">Start Over</button>
        `
        })
    }
  
    // Display transition plan
    function displayTransitionPlan(plan) {
      if (!plan || !plan.steps || plan.steps.length === 0) {
        transitionPlan.innerHTML = `
          <div class="alert alert-info">
            No transition plan available. Please try a different career path.
          </div>
          <button class="btn btn-primary" id="tryDifferentPath">Try Different Path</button>
        `
  
        document.getElementById("tryDifferentPath").addEventListener("click", () => {
          step4.classList.remove("active")
          step4.classList.add("d-none")
          step3.classList.remove("d-none")
          step3.classList.add("active")
        })
  
        return
      }
  
      const stepsHTML = plan.steps
        .map(
          (step, index) => `
        <div class="transition-step">
          <h4>${index + 1}. ${step.title}</h4>
          <p>${step.description}</p>
          ${
            step.resources
              ? `
            <div class="resources">
              <strong>Resources:</strong>
              <ul>
                ${step.resources
                  .map(
                    (resource) => `
                  <li><a href="${resource.url}" target="_blank">${resource.title}</a></li>
                `,
                  )
                  .join("")}
              </ul>
            </div>
          `
              : ""
          }
        </div>
      `,
        )
        .join("")
  
      transitionPlan.innerHTML = `
        <div class="mb-4">
          <p>${plan.overview}</p>
        </div>
        <div class="transition-timeline">
          ${stepsHTML}
        </div>
        <div class="mt-4">
          <button class="btn btn-primary" onclick="window.print()">Print Plan</button>
          <button class="btn btn-outline-primary ms-2" id="saveAsPdf">Save as PDF</button>
        </div>
      `
    }
  
    // Back to career paths button
    backToPathsBtn.addEventListener("click", () => {
      step4.classList.remove("active")
      step4.classList.add("d-none")
      step3.classList.remove("d-none")
      step3.classList.add("active")
    })
  })
  