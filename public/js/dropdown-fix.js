document.addEventListener("DOMContentLoaded", () => {
    // Only apply dropdown fixes on desktop
    if (window.innerWidth >= 768) {
      // Get the user menu dropdown
      const userMenuButton = document.getElementById("userMenuButton")
      const dropdownMenu = document.querySelector(".user-menu .dropdown-menu")
  
      if (userMenuButton && dropdownMenu) {
        // Function to adjust dropdown position
        function adjustDropdownPosition() {
          // Get the button's position and dimensions
          const buttonRect = userMenuButton.getBoundingClientRect()
  
          // Calculate the dropdown's position
          const dropdownTop = buttonRect.bottom + 5 // 5px gap
          const dropdownRight = window.innerWidth - buttonRect.right
  
          // Set the dropdown's position
          dropdownMenu.style.top = `${dropdownTop}px`
          dropdownMenu.style.right = `${dropdownRight}px`
  
          // Ensure the dropdown is visible
          const dropdownRect = dropdownMenu.getBoundingClientRect()
          if (dropdownRect.bottom > window.innerHeight) {
            // If dropdown extends beyond viewport, position it above the button
            dropdownMenu.style.top = `${buttonRect.top - dropdownRect.height - 5}px`
          }
        }
  
        // Adjust position when dropdown is shown
        userMenuButton.addEventListener("click", () => {
          // Use setTimeout to ensure the dropdown is visible before adjusting
          setTimeout(adjustDropdownPosition, 0)
        })
  
        // Adjust position on window resize
        window.addEventListener("resize", () => {
          if (dropdownMenu.classList.contains("show")) {
            adjustDropdownPosition()
          }
        })
      }
    }
  })
  