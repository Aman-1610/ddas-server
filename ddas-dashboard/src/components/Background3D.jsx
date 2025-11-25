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

    const color = props.theme === 'light' ? '#7000ff' : '#00f2ff';

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color={color}
                    size={0.005}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
}



export default function Background3D({ theme }) {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <Stars theme={theme} />
            </Canvas>
        </div>
    );
}
