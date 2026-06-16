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

// Try Now buttons → respective journal tab
// Order in HTML: Q&A, Planner, Wreck This, Notebook
const journalRoutes = [
    "journal.html?tab=qa",
    "journal.html?tab=planner",
    "journal.html?tab=wreck",
    "journal.html?tab=notebook"
];

document.querySelectorAll('.try-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
        window.location.href = journalRoutes[i];
    });
});

// Create First Entry → Notebook journal
const createBtn = document.querySelector('.create');
if (createBtn) {
    createBtn.addEventListener('click', () => {
        window.location.href = "journal.html?tab=notebook";
    });
}

// Navbar active link highlight
const navLinks = document.querySelectorAll('nav ul li a');
navLinks.forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add('active');
    }
});