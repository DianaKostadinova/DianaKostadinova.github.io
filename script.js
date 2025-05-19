document.addEventListener('DOMContentLoaded', function () {
    const panels = document.querySelectorAll('.content-panel');
    const navLinks = document.querySelectorAll('.nav-link');
    const leftBtn = document.querySelector('.left-btn');
    const rightBtn = document.querySelector('.right-btn');
    let currentPanel = 0;

    showPanel(currentPanel);

    function showPanel(index) {
        
        panels.forEach(panel => {
            panel.classList.remove('active');
        });

        panels[index].classList.add('active');

       
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        document.querySelectorAll(`.nav-link[data-panel="${index}"]`).forEach(link => {
            link.classList.add('active');
        });

        currentPanel = index;

        // Scroll to top
        window.scrollTo(0, 0);
    }

   
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const panelIndex = parseInt(this.getAttribute('data-panel'));
            showPanel(panelIndex);
        });
    });

    leftBtn.addEventListener('click', function () {
        const newPanel = (currentPanel - 1 + panels.length) % panels.length;
        showPanel(newPanel);
    });

    rightBtn.addEventListener('click', function () {
        const newPanel = (currentPanel + 1) % panels.length;
        showPanel(newPanel);
    });

    
    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') leftBtn.click();
        if (e.key === 'ArrowRight') rightBtn.click();
    });

   
    function checkScreenSize() {
        if (window.innerWidth <= 768) {
            leftBtn.style.display = 'none';
            rightBtn.style.display = 'none';
        } else {
            leftBtn.style.display = 'flex';
            rightBtn.style.display = 'flex';
        }
    }

    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard: " + text);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}
