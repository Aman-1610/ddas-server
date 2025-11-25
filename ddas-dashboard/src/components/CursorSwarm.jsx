import React, { useEffect, useRef } from 'react';

const CursorSwarm = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        const particleCount = 200;

        // Track mouse state
        let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        let isMoving = false;
        let stopTimeout;

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            isMoving = true;

            clearTimeout(stopTimeout);
            stopTimeout = setTimeout(() => {
                isMoving = false;
            }, 100);
        };

        window.addEventListener('mousemove', handleMouseMove);

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = 0;
                this.vy = 0;
                this.size = Math.random() * 1.5 + 0.5; // 0.5-2px
                // Electric blue / Cyan colors
                const blue = Math.floor(Math.random() * 55 + 200); // 200-255
                const green = Math.floor(Math.random() * 100 + 155); // 155-255
                this.color = `rgba(0, ${green}, ${blue}, ${Math.random() * 0.6 + 0.4})`;

                // Orbit properties
                this.angle = Math.random() * Math.PI * 2;
                this.orbitRadius = Math.random() * 40 + 20; // 20-60px radius
                this.orbitSpeed = (Math.random() - 0.5) * 0.05;
                this.offset = Math.random() * Math.PI * 2;
            }

            update(time) {
                // Calculate distance to mouse
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (isMoving || distance > 100) {
                    // TRAIL EFFECT: Move towards mouse with ease-in
                    // The further away, the faster they move to catch up
                    const speed = 0.08 + (distance * 0.0001);
                    this.x += dx * speed;
                    this.y += dy * speed;
                } else {
                    // BUBBLING / ORBIT EFFECT:
                    // When mouse stops, particles settle into a breathing orbit
                    this.angle += this.orbitSpeed;

                    // Breathing radius using sine wave
                    const breathingRadius = this.orbitRadius + Math.sin(time * 0.005 + this.offset) * 10;

                    const targetX = mouse.x + Math.cos(this.angle) * breathingRadius;
                    const targetY = mouse.y + Math.sin(this.angle) * breathingRadius;

                    // Smoothly move to orbit position
                    this.x += (targetX - this.x) * 0.1;
                    this.y += (targetY - this.y) * 0.1;
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();

                // Slight glow
                ctx.shadowBlur = 4;
                ctx.shadowColor = this.color;
            }
        }

        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        let time = 0;
        const animate = () => {
            // Clear with slight fade for trail effect (optional, but requested "trailing effect")
            // Using clearRect for cleaner look as requested "clean" UI, but let's try a very subtle trail
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            time++;

            particles.forEach(particle => {
                particle.update(time);
                particle.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default CursorSwarm;
