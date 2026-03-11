// Smooth scroll for internal sections
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href'))
            ?.scrollIntoView({ behavior: 'smooth' });
    });
});

// Get Started button → Journal page
const getStartedBtn = document.querySelector('.btn');
if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
        window.location.href = "journal.html";
    });
}

// Try Now buttons (journal types)
document.querySelectorAll('.try-btn').forEach(button => {
    button.addEventListener('click', () => {
        alert("This journal mode will be available after login 🚀");
    });
});

// Create First Entry button
const createBtn = document.querySelector('.create');
if (createBtn) {
    createBtn.addEventListener('click', () => {
        alert("Sign up to start your first journal entry ✨");
    });
}

// Navbar active link highlight
const navLinks = document.querySelectorAll('nav ul li a');
navLinks.forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add('active');
    }
});

// LOGIN / LOGOUT LOGIC
const authBtn = document.getElementById("auth-btn");

// Check login state on page load
function updateAuthUI() {
    const isLoggedIn = localStorage.getItem("loggedIn");

    if (isLoggedIn === "true") {
        authBtn.textContent = "Logout";
    } else {
        authBtn.textContent = "Login";
    }
}

updateAuthUI();

// Handle login / logout click
authBtn.addEventListener("click", () => {
    const isLoggedIn = localStorage.getItem("loggedIn");

   if (isLoggedIn === "true") {
    // Logout
    localStorage.removeItem("loggedIn");
    updateAuthUI();
    } else {
        // Login (dummy login)
        localStorage.setItem("loggedIn", "true");
        alert("Login successful 🎉");
        updateAuthUI();
    }
});
