window.addEventListener('load', () => {
    function addZeroes(x, n = 2) {
        x = x.toString();
        while (x.length < n) {
            x = '0' + x;
        }
        return x;
    }

    function updateClocks() {
        const now = new Date();
        const s = addZeroes(now.getHours()) + ':' + addZeroes(now.getMinutes());

        document.querySelectorAll('.clock').forEach(clock => {
            clock.innerHTML = s;
        });
    }

    setInterval(() => updateClocks(), 1000);
});
