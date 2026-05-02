============================================
   OARCEL — 3D Mouse Tilt for Dept Cards
   Paste this at the END of your app.js
   ============================================ */

(function init3DTilt() {
    // Activate tilt on all dept cards (and future ones)
    function attachTilt(card) {
        if (card._tilt3d) return; // already attached
        card._tilt3d = true;

        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
        card.addEventListener('mouseenter', onEnter);
    }

    function onEnter(e) {
        const card = e.currentTarget;
        card.style.transition = 'transform 0.15s ease, box-shadow 0.25s ease';
    }

    function onMove(e) {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);   // -1 to 1
        const dy = (e.clientY - cy) / (rect.height / 2);  // -1 to 1

        const rotX = -dy * 8;   // max ±8deg vertical
        const rotY =  dx * 12;  // max ±12deg horizontal
        const lift = 6;

        card.style.transform = `
            perspective(700px)
            rotateX(${rotX}deg)
            rotateY(${rotY}deg)
            translateX(6px)
            translateY(-${lift}px)
            scale(1.01)
        `;
        card.style.boxShadow = `
            ${-dx * 12}px ${-dy * 8}px 32px rgba(0,0,0,0.25),
            0 16px 40px rgba(0,0,0,0.2)
        `;
    }

    function onLeave(e) {
        const card = e.currentTarget;
        card.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease';
        card.style.transform = '';
        card.style.boxShadow = '';
    }

    // Observe DOM for dept cards (they're created dynamically)
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.dept-card').forEach(attachTilt);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Attach to any already-rendered cards
    document.querySelectorAll('.dept-card').forEach(attachTilt);

    // Also add subtle parallax to ambient orbs on mouse move
    const glow1 = document.querySelector('.glow-1');
    const glow2 = document.querySelector('.glow-2');

    document.addEventListener('mousemove', (e) => {
        const px = (e.clientX / window.innerWidth - 0.5);
        const py = (e.clientY / window.innerHeight - 0.5);

        if (glow1) {
            glow1.style.transform = `translate(${px * 40}px, ${py * 30}px) scale(1.05)`;
            glow1.style.transition = 'transform 1.2s ease';
        }
        if (glow2) {
            glow2.style.transform = `translate(${-px * 30}px, ${-py * 20}px) scale(1.05)`;
            glow2.style.transition = 'transform 1.4s ease';
        }
    });
})();