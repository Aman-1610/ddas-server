import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';

function Stars(props) {
    const ref = useRef();
    const [sphere] = useMemo(() => {
        const positions = random.inSphere(new Float32Array(5000), { radius: 1.5 });
        // Verify we have valid positions (no NaNs)
        for (let i = 0; i < positions.length; i++) {
            if (isNaN(positions[i])) positions[i] = 0;
        }
        return [positions];
    }, []);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#00f2ff"
                    size={0.005}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
}

function MouseTracker() {
    const ref = useRef();
    useFrame(({ mouse, viewport }) => {
        if (ref.current) {
            const x = (mouse.x * viewport.width) / 2;
            const y = (mouse.y * viewport.height) / 2;
            ref.current.position.set(x, y, 0);
        }
    });
    return (
        <mesh ref={ref}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#7000ff" transparent opacity={0.5} />
        </mesh>
    );
}

export default function Background3D() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <Stars />
                <MouseTracker />
            </Canvas>
        </div>
    );
}
