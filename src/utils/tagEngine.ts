import { ConstellationEdge, StarCluster, StarNode } from '../types';
import { getClusterTheme } from './colorPalette';

const KEYWORD_DICTIONARY: Record<string, string[]> = {
  // Digital art / visuals
  shader: ['#shaders', '#glsl', '#generative'],
  glsl: ['#shaders', '#webgl', '#graphics'],
  generative: ['#generative', '#algorithmic', '#digital-art'],
  procedural: ['#procedural', '#generative', '#math-art'],
  raymarching: ['#raymarching', '#shaders', '#3d-math'],
  fractal: ['#fractals', '#math-art', '#recursion'],
  noise: ['#perlin-noise', '#generative', '#texture'],
  pixel: ['#pixel-art', '#retro', '#cyber'],
  canvas: ['#webgl', '#digital-art', '#graphics'],
  glitch: ['#glitch-art', '#cyberpunk', '#texture'],
  
  // Poetry / space / atmosphere
  moon: ['#lunar', '#night-sky', '#solitude'],
  star: ['#starlight', '#cosmos', '#night-sky'],
  starlight: ['#starlight', '#astronomy', '#night-sky'],
  orbit: ['#orbital', '#gravity', '#astrophysics'],
  lightyears: ['#lightyears', '#deep-space', '#solitude'],
  whisper: ['#whispers', '#intimacy', '#midnight'],
  midnight: ['#midnight', '#solitude', '#night-sky'],
  silence: ['#silence', '#void', '#deep-space'],
  memory: ['#memory', '#nostalgia', '#echoes'],
  echo: ['#echoes', '#resonance', '#memory'],
  heart: ['#emotion', '#vulnerability', '#human'],
  darkness: ['#void', '#deep-space', '#abyss'],
  nebula: ['#nebula', '#deep-space', '#interstellar'],
  supernova: ['#supernova', '#energy', '#astrophysics'],
  
  // Tech / futures / cyber
  quantum: ['#quantum', '#physics', '#superposition'],
  dyson: ['#dyson-swarm', '#megastructures', '#future-energy'],
  neural: ['#neural-nets', '#ai-agents', '#cognition'],
  ai: ['#artificial-intelligence', '#synthetic-mind', '#futures'],
  silicon: ['#silicon-life', '#post-human', '#hardware'],
  cyber: ['#cybernetics', '#cyberpunk', '#interface'],
  protocol: ['#protocols', '#mesh-network', '#decentralized'],
  entropy: ['#entropy', '#thermodynamics', '#time-arrow'],
  fermi: ['#fermi-paradox', '#cosmic-solitude', '#seti'],
  consciousness: ['#consciousness', '#synthetic-mind', '#philosophy'],
  singularity: ['#singularity', '#post-human', '#super-intelligence'],
  warp: ['#warp-drive', '#spacetime', '#relativity'],
  gravity: ['#gravity', '#spacetime', '#astrophysics'],
  matrix: ['#simulation', '#digital-mind', '#virtual-realms'],
  recursion: ['#recursion', '#fractals', '#infinity'],
  infinity: ['#infinity', '#cosmos', '#philosophy'],
};

const CLUSTER_DEFAULT_TAGS: Record<StarCluster, string[]> = {
  'Digital Art': ['#generative', '#shaders', '#digital-art'],
  'Late Night Poetry': ['#midnight', '#starlight', '#poetry'],
  'Tech Futures': ['#quantum', '#mesh-network', '#deep-space'],
  'Cosmic Philosophy': ['#fermi-paradox', '#entropy', '#cosmos'],
  'Cybernetics': ['#neural-nets', '#synthetic-mind', '#bio-digital'],
  'Our Universe': ['#private-cosmos', '#collaborators', '#our-universe'],
};

export interface AIExtractionResult {
  tags: string[];
  cluster?: StarCluster;
  moodColor?: string;
}

export function getGeminiApiKey(): string | undefined {
  try {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
    const procEnv = typeof process !== 'undefined' ? (process as any).env : undefined;

    return (
      metaEnv?.VITE_GEMINI_API_KEY ||
      metaEnv?.GEMINI_API_KEY ||
      procEnv?.GEMINI_API_KEY ||
      procEnv?.VITE_GEMINI_API_KEY
    );
  } catch {
    return undefined;
  }
}

export function extractThematicTags(content: string, title: string, cluster: StarCluster): string[] {
  const combinedText = `${title} ${content}`.toLowerCase().replace(/[^a-z0-9\s#]/g, ' ');
  const words = combinedText.split(/\s+/).filter(Boolean);
  
  // Extract explicit #tags first
  const explicitTags = words.filter(w => w.startsWith('#')).map(t => t.toLowerCase());
  const foundTags = new Set<string>(explicitTags);

  // Match keywords
  for (const word of words) {
    if (KEYWORD_DICTIONARY[word]) {
      KEYWORD_DICTIONARY[word].forEach(t => foundTags.add(t));
    }
  }

  // Fallback defaults from cluster if less than 3
  if (foundTags.size < 3) {
    const defaults = CLUSTER_DEFAULT_TAGS[cluster] || ['#idea', '#cosmos', '#discovery'];
    for (const tag of defaults) {
      foundTags.add(tag);
      if (foundTags.size >= 3) break;
    }
  }

  return Array.from(foundTags).slice(0, 4);
}

export async function extractThematicTagsWithAI(
  content: string,
  title: string,
  currentCluster: StarCluster
): Promise<AIExtractionResult> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    console.warn('No Gemini API key found in environment variables (VITE_GEMINI_API_KEY / GEMINI_API_KEY). Using local keyword extraction.');
    return {
      tags: extractThematicTags(content, title, currentCluster),
      cluster: currentCluster,
      moodColor: getClusterTheme(currentCluster)?.color || '#FFD700',
    };
  }

  try {
    const prompt = `You are a cosmic idea analyzer for the Asterful graph network.
Analyze this post:
Title: "${title}"
Content: "${content}"

Task:
1. Extract 3 high-relevance thematic tags prefixed with '#' (e.g. #generative, #starlight, #quantum-mind).
2. Choose the best existing cluster from the list: ["Digital Art", "Late Night Poetry", "Tech Futures", "Cosmic Philosophy", "Cybernetics"] OR create a concise 2-3 word 'cluster' name if the content represents a brand-new category (e.g. "Culinary Arts", "Quantum Physics", "Forensic Science", "Acoustic Ecology").
3. Pick a glowing cosmic mood hex color (e.g. #00f3ff, #b026ff, #ffd700, #ff007f, #00ff88, #38bdf8, #f59e0b).

Respond strictly with a JSON object matching this schema:
{
  "tags": ["#tag1", "#tag2", "#tag3"],
  "cluster": string,
  "moodColor": string
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          }
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Gemini API returned status ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('No candidate content received in Gemini API response');
    }

    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Normalize tags
    const validTags: string[] = Array.isArray(parsed.tags)
      ? parsed.tags
          .map((t: any) => String(t).trim().toLowerCase())
          .filter(Boolean)
          .map((t: string) => (t.startsWith('#') ? t : `#${t}`))
          .slice(0, 4)
      : [];

    const rawCluster = typeof parsed.cluster === 'string' ? parsed.cluster.trim() : '';
    const chosenCluster = rawCluster.length > 0 ? rawCluster : currentCluster;

    const chosenMoodColor =
      typeof parsed.moodColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(parsed.moodColor)
        ? parsed.moodColor
        : (getClusterTheme(chosenCluster)?.color || '#FFD700');

    return {
      tags: validTags.length > 0 ? validTags : extractThematicTags(content, title, chosenCluster),
      cluster: chosenCluster,
      moodColor: chosenMoodColor,
    };
  } catch (err) {
    console.warn('Gemini API extraction encountered an error or timed out; falling back to local extractor:', err);
    return {
      tags: extractThematicTags(content, title, currentCluster),
      cluster: currentCluster,
      moodColor: getClusterTheme(currentCluster)?.color || '#FFD700',
    };
  }
}

export function computeConstellationEdges(stars: StarNode[]): ConstellationEdge[] {
  const edges: ConstellationEdge[] = [];
  const edgeSet = new Set<string>();

  for (let i = 0; i < stars.length; i++) {
    const starA = stars[i];
    for (let j = i + 1; j < stars.length; j++) {
      const starB = stars[j];

      // Check remix relationship
      const isRemix = starA.parentId === starB.id || starB.parentId === starA.id;

      // Find shared tags (normalize lowercase)
      const tagsA = new Set(starA.tags.map(t => t.toLowerCase().trim()));
      const sharedTags = starB.tags
        .map(t => t.toLowerCase().trim())
        .filter(t => tagsA.has(t));

      // Connected if they share 1+ tags or have a remix relationship
      if (sharedTags.length > 0 || isRemix) {
        const edgeKey = [starA.id, starB.id].sort().join('---');
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            id: `edge-${edgeKey}`,
            sourceId: starA.id,
            targetId: starB.id,
            sharedTags,
            isRemix,
            strength: Math.min(3, Math.max(1, sharedTags.length + (isRemix ? 2 : 0))),
          });
        }
      }
    }
  }

  return edges;
}

export function calculateSpawnPosition(
  parentStar: StarNode | null,
  cluster: StarCluster,
  existingStars: StarNode[]
): { x: number; y: number } {
  if (parentStar) {
    // Spawn in celestial orbit around the parent star (angle with random variance, radius 120-180)
    const angle = Math.random() * Math.PI * 2;
    const distance = 130 + Math.random() * 60;
    return {
      x: parentStar.x + Math.cos(angle) * distance,
      y: parentStar.y + Math.sin(angle) * distance,
    };
  }

  // Find center of matching cluster if any exist
  const clusterStars = existingStars.filter(s => s.cluster === cluster);
  if (clusterStars.length > 0) {
    const avgX = clusterStars.reduce((acc, s) => acc + s.x, 0) / clusterStars.length;
    const avgY = clusterStars.reduce((acc, s) => acc + s.y, 0) / clusterStars.length;
    const angle = Math.random() * Math.PI * 2;
    const distance = 140 + Math.random() * 90;
    return {
      x: avgX + Math.cos(angle) * distance,
      y: avgY + Math.sin(angle) * distance,
    };
  }

  // Cluster regional defaults
  const clusterOffsets: Record<StarCluster, { x: number; y: number }> = {
    'Digital Art': { x: -350, y: -200 },
    'Late Night Poetry': { x: 350, y: -180 },
    'Tech Futures': { x: -280, y: 260 },
    'Cosmic Philosophy': { x: 300, y: 250 },
    'Cybernetics': { x: 0, y: 0 },
    'Our Universe': { x: 0, y: -380 },
  };

  const center = clusterOffsets[cluster] || { x: 0, y: 0 };
  const randomOffsetAngle = Math.random() * Math.PI * 2;
  const randomDist = 50 + Math.random() * 80;
  return {
    x: center.x + Math.cos(randomOffsetAngle) * randomDist,
    y: center.y + Math.sin(randomOffsetAngle) * randomDist,
  };
}
