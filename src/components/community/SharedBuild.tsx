import { useState } from 'react';
import CommunityBuild from './CommunityBuild';
import type { Post } from './types';
export default function SharedBuild({ build }: {
    build: Post['build'];
}) { const [active, setActive] = useState(false); return <CommunityBuild build={build} active={active} onPreview={() => setActive(value => !value)}/>; }
