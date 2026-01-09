// to activate npm: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass


import React, { useState, useEffect } from 'react';
import { RefreshCw, Settings, Download, ChevronDown, ChevronUp } from 'lucide-react';

// Exact implementation matching Python script
const generateTrials = (params) => {
  const {
    nEpisodes,
    episodeAngleShiftCue1,
    episodeAngleShiftCue2,
    rule3Shift,
    kappa,
    angleNoiseStd,
    featureLen,
    minEpisodeLength,
    maxEpisodeLength,
    targetMeanMin,
    targetMeanMax,
    maxSameColorStreak,
    minLearningPhaseTrials,
    maxLearningPhaseTrials,
    minOmissionRate,
    maxOmissionRate,
    minOddballRate,
    maxOddballRate,
    oddballAngleShift
  } = params;

  // Suppress unused variable warnings
  const _unused = { kappa, featureLen };

  // Color pairs
  const colorPairs = [
    [['#df9998', '#03bfb6'], ['peach', 'mint']],
    [['#c3a86a', '#4cb6e4'], ['curry', 'skyblue']],
    [['#7eba79', '#b7a2d4'], ['frog', 'lavender']]
  ];
  
  const selectedPairIdx = Math.floor(Math.random() * colorPairs.length);
  const [cueColors, cueColorLabels] = colorPairs[selectedPairIdx];

  // Generate balanced episode lengths
  const generateEpisodeLengths = () => {
    let attempts = 0;
    while (attempts < 1000) {
      const lengths = [];
      for (let i = 0; i < nEpisodes; i++) {
        lengths.push(Math.floor(Math.random() * (maxEpisodeLength - minEpisodeLength + 1)) + minEpisodeLength);
      }
      
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      if (mean >= targetMeanMin && mean <= targetMeanMax) {
        return lengths;
      }
      attempts++;
    }
    throw new Error('Could not generate episode lengths');
  };

  const episodeLengths = generateEpisodeLengths();

  // Generate balanced identities
  const generateBalancedIdentities = () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const all8 = [1, 1, 1, 1, 2, 2, 2, 2];
      for (let i = all8.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all8[i], all8[j]] = [all8[j], all8[i]];
      }
      
      const first4 = all8.slice(0, 4);
      if (first4.filter(x => x === 1).length === 2) {
        return all8;
      }
    }
    throw new Error('Could not balance identities');
  };

  let episodeIdentities = generateBalancedIdentities();

  // Generate valid cue sequence
  const generateValidCueSequence = (nTrials, requiredStart, learningTrials) => {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const nColor1 = Math.floor(Math.random() * 5) + Math.max(1, Math.floor(nTrials / 2) - 2);
      const nColor2 = nTrials - nColor1;
      
      const sequence = [];
      const counts = { [cueColors[0]]: 0, [cueColors[1]]: 0 };
      
      // Learning phase
      if (learningTrials > 0 && requiredStart) {
        for (let i = 0; i < Math.min(learningTrials, nTrials); i++) {
          sequence.push(requiredStart);
          counts[requiredStart]++;
        }
      }
      
      // Fill remaining
      const remaining = nTrials - sequence.length;
      let remaining1 = nColor1 - counts[cueColors[0]];
      let remaining2 = nColor2 - counts[cueColors[1]];
      
      const tempCounts = { [cueColors[0]]: remaining1, [cueColors[1]]: remaining2 };
      
      for (let pos = 0; pos < remaining; pos++) {
        let available = cueColors.filter(c => tempCounts[c] > 0);
        
        if (sequence.length >= maxSameColorStreak) {
          if (sequence.slice(-maxSameColorStreak).every(c => c === sequence[sequence.length - 1])) {
            available = available.filter(c => c !== sequence[sequence.length - 1]);
          }
        }
        
        if (available.length === 0) break;
        
        const chosen = available[Math.floor(Math.random() * available.length)];
        sequence.push(chosen);
        tempCounts[chosen]--;
      }
      
      if (sequence.length === nTrials &&
          sequence.filter(c => c === cueColors[0]).length === nColor1 &&
          sequence.filter(c => c === cueColors[1]).length === nColor2 &&
          (!requiredStart || sequence[0] === requiredStart)) {
        return sequence;
      }
    }
    
    throw new Error('Could not generate valid sequence');
  };

  // Plan all episodes
  const planEpisodes = () => {
    for (let planAttempt = 0; planAttempt < 1000; planAttempt++) {
      try {
        const episodeSequences = [];
        const actualIdentities = [];
        let prevLastColor = null;
        
        for (let episode = 1; episode <= nEpisodes; episode++) {
          const episodeLength = episodeLengths[episode - 1];
          let requiredStartColor = prevLastColor;
          let learningTrials = 0;
          
          if (episode >= 2 && episode <= 5) {
            const requiredIdentity = episodeIdentities[episode - 2];
            const requiredLearningColor = cueColors[requiredIdentity - 1];
            
            if (requiredStartColor && requiredStartColor !== requiredLearningColor) {
              throw new Error('Conflict');
            }
            
            requiredStartColor = requiredLearningColor;
            learningTrials = Math.floor(Math.random() * (maxLearningPhaseTrials - minLearningPhaseTrials + 1)) + minLearningPhaseTrials;
          }
          
          const sequence = generateValidCueSequence(episodeLength, requiredStartColor, learningTrials);
          episodeSequences.push(sequence);
          prevLastColor = sequence[sequence.length - 1];
          
          if (episode >= 2) {
            const startIdentity = sequence[0] === cueColors[0] ? 1 : 2;
            actualIdentities.push(startIdentity);
          }
        }
        
        const first4 = actualIdentities.slice(0, 4);
        if (first4.filter(x => x === 1).length === 2 && first4.filter(x => x === 2).length === 2 &&
            actualIdentities.filter(x => x === 1).length === 4 && actualIdentities.filter(x => x === 2).length === 4) {
          return episodeSequences;
        }
        
        throw new Error('Not balanced');
      } catch (e) {
        episodeIdentities = generateBalancedIdentities();
        continue;
      }
    }
    
    throw new Error('Could not plan episodes');
  };

  const episodePlan = planEpisodes();

  // Add angle noise
  const addAngleNoise = (targetAngle) => {
    const noise = (Math.random() - 0.5) * 2 * angleNoiseStd;
    return (targetAngle + noise + 360) % 360;
  };

  // Build trials
  const allTrials = [];
  let trialCounter = 1;
  const initialStartAngle = Math.floor(Math.random() * 360) + 1;

  for (let episode = 1; episode <= nEpisodes; episode++) {
    const episodeLength = episodeLengths[episode - 1];
    const cueSequence = episodePlan[episode - 1];
    
    // Determine start angle
    let startAngle;
    if (episode === 1) {
      startAngle = initialStartAngle;
    } else {
      startAngle = initialStartAngle;
      for (let ep = 2; ep <= episode; ep++) {
        const epFirstIdentity = episodePlan[ep - 1][0] === cueColors[0] ? 1 : 2;
        const epShift = epFirstIdentity === 1 ? episodeAngleShiftCue1 : episodeAngleShiftCue2;
        startAngle = (startAngle + epShift) % 360;
      }
    }
    
    for (let i = 0; i < episodeLength; i++) {
      const baseAngle = startAngle % 360;
      const cueIdentity = cueSequence[i] === cueColors[0] ? 1 : 2;
      
      let targetVectorAngle = baseAngle;
      if (cueIdentity === 2) {
        targetVectorAngle = (baseAngle + rule3Shift) % 360;
      }
      
      const actualVectorAngle = addAngleNoise(targetVectorAngle);
      const angleNoise = ((actualVectorAngle - targetVectorAngle + 180) % 360) - 180;
      
      allTrials.push({
        episode,
        episodeLength,
        trialInEpisode: i + 1,
        cueColor: cueSequence[i],
        cueIdentity,
        targetVectorAngle: Math.round(targetVectorAngle * 100) / 100,
        actualVectorAngle: Math.round(actualVectorAngle * 100) / 100,
        angleNoise: Math.round(angleNoise * 100) / 100,
        trialIndex: trialCounter,
        isOddball: false,
        outcomeOccurred: 1
      });
      
      trialCounter++;
    }
  }

  // Assign outcome omissions
  const outcomes = allTrials.map(() => 1);
  const episodeGroups = {};
  
  allTrials.forEach((trial, idx) => {
    if (!episodeGroups[trial.episode]) episodeGroups[trial.episode] = [];
    episodeGroups[trial.episode].push(idx);
  });
  
  for (const [ep, indices] of Object.entries(episodeGroups)) {
    const episodeLength = indices.length;
    const episodeRate = Math.random() * (maxOmissionRate - minOmissionRate) + minOmissionRate;
    let targetOmissions = Math.round(episodeLength * episodeRate);
    
    const minAllowed = Math.max(1, Math.round(episodeLength * minOmissionRate));
    const maxAllowed = Math.round(episodeLength * maxOmissionRate);
    targetOmissions = Math.max(minAllowed, Math.min(maxAllowed, targetOmissions));
    
    const validIndices = [];
    for (const idx of indices) {
      const trial = allTrials[idx];
      if (trial.trialInEpisode <= 4) continue;
      if (trial.trialInEpisode === trial.episodeLength) continue;
      if (idx > 0 && allTrials[idx].cueColor !== allTrials[idx - 1].cueColor) continue;
      validIndices.push(idx);
    }
    
    targetOmissions = Math.min(targetOmissions, validIndices.length);
    
    const shuffled = [...validIndices].sort(() => Math.random() - 0.5);
    const selected = [];
    
    for (const candidate of shuffled) {
      if (selected.every(s => Math.abs(candidate - s) > 1)) {
        selected.push(candidate);
        if (selected.length >= targetOmissions) break;
      }
    }
    
    if (selected.length < targetOmissions) {
      const remaining = validIndices.filter(idx => !selected.includes(idx));
      const needed = targetOmissions - selected.length;
      selected.push(...remaining.slice(0, needed));
    }
    
    for (const idx of selected) {
      outcomes[idx] = 0;
    }
  }

  allTrials.forEach((trial, idx) => {
    trial.outcomeOccurred = outcomes[idx];
  });

  // Assign oddballs
  const oddballs = allTrials.map(() => false);
  
  for (const [ep, indices] of Object.entries(episodeGroups)) {
    const episodeLength = indices.length;
    const episodeRate = Math.random() * (maxOddballRate - minOddballRate) + minOddballRate;
    let targetOddballs = Math.round(episodeLength * episodeRate);
    
    const minAllowed = Math.max(1, Math.round(episodeLength * minOddballRate));
    const maxAllowed = Math.round(episodeLength * maxOddballRate);
    targetOddballs = Math.max(minAllowed, Math.min(maxAllowed, targetOddballs));
    
    const validIndices = [];
    for (const idx of indices) {
      const trial = allTrials[idx];
      if (trial.trialInEpisode <= 4) continue;
      if (trial.trialInEpisode === trial.episodeLength) continue;
      if (idx > 0 && allTrials[idx].cueColor !== allTrials[idx - 1].cueColor) continue;
      if (outcomes[idx] === 0) continue;
      if (idx + 1 < outcomes.length && outcomes[idx + 1] === 0) continue;
      if (idx - 1 >= 0 && outcomes[idx - 1] === 0) continue;
      validIndices.push(idx);
    }
    
    targetOddballs = Math.min(targetOddballs, validIndices.length);
    
    const shuffled = [...validIndices].sort(() => Math.random() - 0.5);
    const selected = [];
    
    for (const candidate of shuffled) {
      if (selected.every(s => Math.abs(candidate - s) > 1)) {
        selected.push(candidate);
        if (selected.length >= targetOddballs) break;
      }
    }
    
    for (const idx of selected) {
      oddballs[idx] = true;
      
      const trial = allTrials[idx];
      const oddballTarget = (trial.targetVectorAngle + oddballAngleShift) % 360;
      const oddballActual = addAngleNoise(oddballTarget);
      trial.actualVectorAngle = Math.round(oddballActual * 100) / 100;
      trial.angleNoise = Math.round((((oddballActual - oddballTarget + 180) % 360) - 180) * 100) / 100;
    }
  }

  allTrials.forEach((trial, idx) => {
    trial.isOddball = oddballs[idx];
  });

  return {
    trials: allTrials,
    cueColors,
    cueColorLabels,
    episodeLengths,
    episodeIdentities
  };
};

// Circular plot
const CircularPlot = ({ trials, selectedEpisode, selectedColor, width = 500, height = 500 }) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 60;
  
  const filteredTrials = trials.filter(t => {
    if (selectedEpisode && t.episode !== selectedEpisode) return false;
    if (selectedColor && t.cueColor !== selectedColor) return false;
    return true;
  });
  
  const angleToCoords = (angle, r = radius) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad)
    };
  };
  
  return (
    <svg width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="2" />
      
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
        const angle = i * 30;
        const coords = angleToCoords(angle, radius + 20);
        return (
          <text
            key={`label-${i}`}
            x={coords.x}
            y={coords.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-gray-600 font-medium"
          >
            {angle}°
          </text>
        );
      })}
      
      {[0, 90, 180, 270].map(angle => {
        const coords = angleToCoords(angle, radius);
        return (
          <line
            key={`line-${angle}`}
            x1={centerX}
            y1={centerY}
            x2={coords.x}
            y2={coords.y}
            stroke="#d1d5db"
            strokeWidth="1"
          />
        );
      })}
      
      {filteredTrials.map((trial, idx) => {
        const coords = angleToCoords(trial.actualVectorAngle, radius * 0.85);
        const size = trial.isOddball ? 6 : 4;
        return (
          <g key={`trial-${idx}`}>
            <circle
              cx={coords.x}
              cy={coords.y}
              r={size}
              fill={trial.cueColor}
              opacity={trial.outcomeOccurred === 0 ? 0.3 : 0.8}
              stroke={trial.isOddball ? "#dc2626" : "white"}
              strokeWidth={trial.isOddball ? 2 : 1}
            />
            <title>
              Trial {trial.trialIndex} | Ep {trial.episode} | {trial.trialInEpisode}/{trial.episodeLength}
              {'\n'}Angle: {trial.actualVectorAngle.toFixed(1)}°
              {'\n'}ID: {trial.cueIdentity}
              {trial.isOddball ? '\n🔴 ODDBALL' : ''}
              {trial.outcomeOccurred === 0 ? '\n⚠️ No Outcome' : ''}
            </title>
          </g>
        );
      })}
      
      <circle cx={centerX} cy={centerY} r="3" fill="#374151" />
    </svg>
  );
};

// Line plot for angle progression
const AngleProgressionPlot = ({ trials, selectedEpisode, selectedColor, width = 800, height = 300 }) => {
  const filteredTrials = trials.filter(t => {
    if (selectedEpisode && t.episode !== selectedEpisode) return false;
    if (selectedColor && t.cueColor !== selectedColor) return false;
    return true;
  });
  
  if (filteredTrials.length === 0) return null;
  
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  
  const xScale = (i) => padding.left + (i / (filteredTrials.length - 1)) * plotWidth;
  const yScale = (angle) => padding.top + (1 - angle / 360) * plotHeight;
  
  // Create path
  const path = filteredTrials.map((t, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(t.actualVectorAngle)}`
  ).join(' ');
  
  return (
    <svg width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#9ca3af"
        strokeWidth="2"
      />
      
      {/* X-axis */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#9ca3af"
        strokeWidth="2"
      />
      
      {/* Y-axis labels */}
      {[0, 90, 180, 270, 360].map(angle => (
        <g key={`y-${angle}`}>
          <line
            x1={padding.left - 5}
            y1={yScale(angle)}
            x2={padding.left}
            y2={yScale(angle)}
            stroke="#9ca3af"
            strokeWidth="1"
          />
          <text
            x={padding.left - 10}
            y={yScale(angle)}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-xs fill-gray-600"
          >
            {angle}°
          </text>
        </g>
      ))}
      
      {/* Axis labels */}
      <text
        x={padding.left + plotWidth / 2}
        y={height - 5}
        textAnchor="middle"
        className="text-sm fill-gray-700 font-medium"
      >
        Trial
      </text>
      
      <text
        x={15}
        y={padding.top + plotHeight / 2}
        textAnchor="middle"
        transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`}
        className="text-sm fill-gray-700 font-medium"
      >
        Angle (°)
      </text>
      
      {/* Plot line */}
      <path
        d={path}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
      />
      
      {/* Plot points */}
      {filteredTrials.map((t, i) => (
        <circle
          key={`point-${i}`}
          cx={xScale(i)}
          cy={yScale(t.actualVectorAngle)}
          r="3"
          fill={t.cueColor}
          opacity={t.outcomeOccurred === 0 ? 0.3 : 0.8}
          stroke={t.isOddball ? "#dc2626" : "white"}
          strokeWidth={t.isOddball ? 2 : 1}
        >
          <title>
            Trial {t.trialIndex} | Episode {t.episode} | Trial {t.trialInEpisode}/{t.episodeLength}
            {'\n'}Angle: {t.actualVectorAngle.toFixed(1)}°
            {'\n'}Identity: {t.cueIdentity}
            {t.isOddball ? '\n🔴 ODDBALL' : ''}
            {t.outcomeOccurred === 0 ? '\n⚠️ No Outcome' : ''}
          </title>
        </circle>
      ))}
    </svg>
  );
};

// Identity comparison plot
const IdentityComparisonPlot = ({ trials, cueColors, width = 600, height = 400 }) => {
  const identity1Trials = trials.filter(t => t.cueIdentity === 1);
  const identity2Trials = trials.filter(t => t.cueIdentity === 2);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  const offset = width / 4;
  
  const angleToCoords = (angle, r, cx, cy) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };
  
  return (
    <svg width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      <text x={width / 2} y={25} textAnchor="middle" className="text-lg fill-gray-800 font-semibold">
        Angle Distribution by Identity
      </text>
      
      <g>
        <text x={offset} y={55} textAnchor="middle" className="text-sm fill-gray-700 font-medium">
          Identity 1 (n={identity1Trials.length})
        </text>
        <circle cx={offset} cy={centerY} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="2" />
        {identity1Trials.map((trial, idx) => {
          const coords = angleToCoords(trial.actualVectorAngle, radius * 0.85, offset, centerY);
          return (
            <circle
              key={`id1-${idx}`}
              cx={coords.x}
              cy={coords.y}
              r="3"
              fill={trial.cueColor}
              opacity="0.6"
            />
          );
        })}
        <circle cx={offset} cy={centerY} r="2" fill="#374151" />
      </g>
      
      <g>
        <text x={width - offset} y={55} textAnchor="middle" className="text-sm fill-gray-700 font-medium">
          Identity 2 (n={identity2Trials.length})
        </text>
        <circle cx={width - offset} cy={centerY} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="2" />
        {identity2Trials.map((trial, idx) => {
          const coords = angleToCoords(trial.actualVectorAngle, radius * 0.85, width - offset, centerY);
          return (
            <circle
              key={`id2-${idx}`}
              cx={coords.x}
              cy={coords.y}
              r="3"
              fill={trial.cueColor}
              opacity="0.6"
            />
          );
        })}
        <circle cx={width - offset} cy={centerY} r="2" fill="#374151" />
      </g>
    </svg>
  );
};


// Histogram
const AngleHistogram = ({ trials, selectedEpisode, selectedColor, width = 500, height = 300 }) => {
  const filteredTrials = trials.filter(t => {
    if (selectedEpisode && t.episode !== selectedEpisode) return false;
    if (selectedColor && t.cueColor !== selectedColor) return false;
    return true;
  });
  
  if (filteredTrials.length === 0) return <div className="text-center text-gray-500 py-8">No trials</div>;
  
  const nBins = 36;
  const binSize = 360 / nBins;
  const bins = Array(nBins).fill(0);
  
  filteredTrials.forEach(t => {
    const binIdx = Math.floor(t.actualVectorAngle / binSize) % nBins;
    bins[binIdx]++;
  });
  
  const maxCount = Math.max(...bins, 1);
  const padding = { top: 30, right: 30, bottom: 50, left: 50 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  
  const barWidth = plotWidth / nBins;
  const yScale = (count) => padding.top + plotHeight - (count / maxCount) * plotHeight;
  
  return (
    <svg width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      <text x={width / 2} y={20} textAnchor="middle" className="text-base fill-gray-800 font-semibold">
        Angle Distribution
      </text>
      
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#374151" strokeWidth="2" />
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#374151" strokeWidth="2" />
      
      {bins.map((count, i) => {
        const x = padding.left + i * barWidth;
        const y = yScale(count);
        const h = height - padding.bottom - y;
        return (
          <rect
            key={`bar-${i}`}
            x={x}
            y={y}
            width={barWidth - 1}
            height={h}
            fill="#6366f1"
            opacity="0.7"
          >
            <title>{`${i * binSize}°-${(i + 1) * binSize}°: ${count} trials`}</title>
          </rect>
        );
      })}
      
      <text x={padding.left + plotWidth / 2} y={height - 5} textAnchor="middle" className="text-sm fill-gray-700 font-semibold">
        Angle (°)
      </text>
    </svg>
  );
};

// Main App
const App = () => {
  const [params, setParams] = useState({
    nEpisodes: 9,
    episodeAngleShiftCue1: 120,
    episodeAngleShiftCue2: 120,
    rule3Shift: 70,
    kappa: 10,
    angleNoiseStd: 10,
    featureLen: 360,
    minEpisodeLength: 16,
    maxEpisodeLength: 24,
    targetMeanMin: 19,
    targetMeanMax: 21,
    maxSameColorStreak: 3,
    minLearningPhaseTrials: 3,
    maxLearningPhaseTrials: 4,
    minOmissionRate: 0.05,
    maxOmissionRate: 0.15,
    minOddballRate: 0.08,
    maxOddballRate: 0.12,
    oddballAngleShift: 120
  });
  
  const [showSettings, setShowSettings] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [data, setData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    handleGenerate();
  }, []);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const result = generateTrials(params);
      setData(result);
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate trials: ' + error.message);
    }
    setIsGenerating(false);
  };
  
  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }));
  };
  
  const handleDownload = () => {
    if (!data) return;
    
    const csv = [
      ['episode', 'trial_in_episode', 'cue_color', 'cue_identity', 'target_vector_angle', 'actual_vector_angle', 'angle_noise', 'trial_index', 'is_oddball', 'outcome_occurred'].join(','),
      ...data.trials.map(t => [
        t.episode,
        t.trialInEpisode,
        t.cueColor,
        t.cueIdentity,
        t.targetVectorAngle.toFixed(2),
        t.actualVectorAngle.toFixed(2),
        t.angleNoise.toFixed(2),
        t.trialIndex,
        t.isOddball ? 1 : 0,
        t.outcomeOccurred
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trial_schedule.csv';
    a.click();
  };
  
  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Generating trials...</div>
        </div>
      </div>
    );
  }
  
  const episodes = [...new Set(data.trials.map(t => t.episode))];
  const totalOmissions = data.trials.filter(t => t.outcomeOccurred === 0).length;
  const totalOddballs = data.trials.filter(t => t.isOddball).length;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Trial Schedule Dashboard</h1>
              <p className="text-gray-600 mt-2">Interactive visualization of experimental trial schedules</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-all font-medium"
              >
                <Settings size={18} />
                {showSettings ? 'Hide' : 'Show'} Settings
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-all font-medium disabled:opacity-50"
              >
                <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'Generating...' : 'Regenerate'}
              </button>
              <button
                onClick={handleDownload}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-all font-medium"
              >
                <Download size={18} />
                Download CSV
              </button>
            </div>
          </div>
        </div>
        
        {showSettings && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Parameters</h2>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Episode Angle Shift - Cue 1 (°)
                </label>
                <input
                  type="number"
                  value={params.episodeAngleShiftCue1}
                  onChange={(e) => handleParamChange('episodeAngleShiftCue1', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Episode Angle Shift - Cue 2 (°)
                </label>
                <input
                  type="number"
                  value={params.episodeAngleShiftCue2}
                  onChange={(e) => handleParamChange('episodeAngleShiftCue2', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rule 3 Shift (°)
                </label>
                <input
                  type="number"
                  value={params.rule3Shift}
                  onChange={(e) => handleParamChange('rule3Shift', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kappa (concentration)
                </label>
                <input
                  type="number"
                  value={params.kappa}
                  onChange={(e) => handleParamChange('kappa', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-3"
            >
              {showAdvancedSettings ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              Advanced Settings
            </button>
            
            {showAdvancedSettings && (
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Angle Noise Std (°)</label>
                  <input type="number" value={params.angleNoiseStd} onChange={(e) => handleParamChange('angleNoiseStd', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Episodes</label>
                  <input type="number" value={params.nEpisodes} onChange={(e) => handleParamChange('nEpisodes', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="1" max="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Episode Length</label>
                  <input type="number" value={params.minEpisodeLength} onChange={(e) => handleParamChange('minEpisodeLength', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Episode Length</label>
                  <input type="number" value={params.maxEpisodeLength} onChange={(e) => handleParamChange('maxEpisodeLength', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Omission Rate</label>
                  <input type="number" step="0.01" value={params.minOmissionRate} onChange={(e) => handleParamChange('minOmissionRate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Omission Rate</label>
                  <input type="number" step="0.01" value={params.maxOmissionRate} onChange={(e) => handleParamChange('maxOmissionRate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Oddball Rate</label>
                  <input type="number" step="0.01" value={params.minOddballRate} onChange={(e) => handleParamChange('minOddballRate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Oddball Rate</label>
                  <input type="number" step="0.01" value={params.maxOddballRate} onChange={(e) => handleParamChange('maxOddballRate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Oddball Angle Shift (°)</label>
                  <input type="number" value={params.oddballAngleShift} onChange={(e) => handleParamChange('oddballAngleShift', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Filters</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Episode</label>
                <select
                  value={selectedEpisode || ''}
                  onChange={(e) => setSelectedEpisode(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Episodes</option>
                  {episodes.map(ep => (
                    <option key={ep} value={ep}>Episode {ep}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cue Color</label>
                <select
                  value={selectedColor || ''}
                  onChange={(e) => setSelectedColor(e.target.value || null)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Colors</option>
                  {data.cueColors.map((color, idx) => (
                    <option key={color} value={color}>
                      {data.cueColorLabels[idx]} (Identity {idx + 1})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Statistics</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Trials:</span>
                <span className="font-bold text-gray-900">{data.trials.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Episodes:</span>
                <span className="font-bold text-gray-900">{params.nEpisodes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Omissions:</span>
                <span className="font-bold text-gray-900">{totalOmissions} ({((totalOmissions / data.trials.length) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Oddballs:</span>
                <span className="font-bold text-gray-900">{totalOddballs} ({((totalOddballs / data.trials.length) * 100).toFixed(1)}%)</span>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded border-2 border-white" style={{ backgroundColor: data.cueColors[0] }}></div>
                  <span className="text-sm font-medium">{data.cueColorLabels[0]} (ID 1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border-2 border-white" style={{ backgroundColor: data.cueColors[1] }}></div>
                  <span className="text-sm font-medium">{data.cueColorLabels[1]} (ID 2)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Circular Plot - Trial Directions</h2>
            <div className="flex justify-center">
              <CircularPlot
                trials={data.trials}
                selectedEpisode={selectedEpisode}
                selectedColor={selectedColor}
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 text-center">
              <p>🔴 Red border = Oddball | Faded = No outcome</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Angle Distribution</h2>
            <div className="flex justify-center">
              <AngleHistogram
                trials={data.trials}
                selectedEpisode={selectedEpisode}
                selectedColor={selectedColor}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Angle Progression Over Trials</h2>
          <div className="overflow-x-auto">
            <AngleProgressionPlot
              trials={data.trials}
              selectedEpisode={selectedEpisode}
              selectedColor={selectedColor}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Identity Comparison</h2>
          <div className="flex justify-center">
            <IdentityComparisonPlot
              trials={data.trials}
              cueColors={data.cueColors}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;