// to activate npm: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Settings, Download, ChevronDown, ChevronUp } from 'lucide-react';

// Comprehensive trial generation matching Python implementation
const generateTrials = (params) => {
  const {
    nEpisodes,
    episodeAngleShiftCue1,
    episodeAngleShiftCue2,
    rule3Shift,
    angleNoiseStd,
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

  // Color setup
  const colorPairs = [
    [['#df9998', '#03bfb6'], ['peach', 'mint']],
    [['#c3a86a', '#4cb6e4'], ['curry', 'skyblue']],
    [['#7eba79', '#b7a2d4'], ['frog', 'lavender']]
  ];
  
  const selectedPairIdx = Math.floor(Math.random() * colorPairs.length);
  const [cueColors, cueColorLabels] = colorPairs[selectedPairIdx];

  // Generate balanced identity sequence
  const generateBalancedIdentities = () => {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const all8 = [1, 1, 1, 1, 2, 2, 2, 2];
      for (let i = all8.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all8[i], all8[j]] = [all8[j], all8[i]];
      }
      
      const first4 = all8.slice(0, 4);
      if (first4.filter(x => x === 1).length === 2 && first4.filter(x => x === 2).length === 2) {
        return all8;
      }
    }
    throw new Error('Could not balance identities');
  };

  const episodeIdentities = generateBalancedIdentities();

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

  // Generate valid cue sequence
  const generateValidCueSequence = (nTrials, requiredStart, requiredEnd, learningTrials) => {
    const maxAttempts = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const nColor1 = Math.floor(Math.random() * 5) + Math.max(1, Math.floor(nTrials / 2 - 2));
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
      let remaining = nTrials - sequence.length;
      if (requiredEnd && remaining > 0) remaining--;
      
      let remaining1 = nColor1 - counts[cueColors[0]];
      let remaining2 = nColor2 - counts[cueColors[1]];
      
      if (requiredEnd) {
        if (requiredEnd === cueColors[0]) remaining1--;
        else remaining2--;
      }
      
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
      
      if (requiredEnd && sequence.length === nTrials - 1) {
        sequence.push(requiredEnd);
      }
      
      if (sequence.length === nTrials &&
          sequence.filter(c => c === cueColors[0]).length === nColor1 &&
          sequence.filter(c => c === cueColors[1]).length === nColor2 &&
          (!requiredStart || sequence[0] === requiredStart) &&
          (!requiredEnd || sequence[sequence.length - 1] === requiredEnd)) {
        return sequence;
      }
    }
    
    throw new Error('Could not generate valid sequence');
  };

  // Pre-plan all episodes
  const planEpisodes = () => {
    const maxAttempts = 100;
    
    for (let planAttempt = 0; planAttempt < maxAttempts; planAttempt++) {
      try {
        const episodeSequences = [];
        const actualIdentities = [];
        let prevLastColor = null;
        
        for (let episode = 1; episode <= nEpisodes; episode++) {
          const episodeLength = episodeLengths[episode - 1];
          let requiredStartColor = prevLastColor;
          let learningTrials = 0;
          let requiredLearningColor = null;
          
          if (episode >= 2 && episode <= 5) {
            const requiredIdentity = episodeIdentities[episode - 2];
            requiredLearningColor = cueColors[requiredIdentity - 1];
            
            if (requiredStartColor && requiredStartColor !== requiredLearningColor) {
              throw new Error(`Conflict in episode ${episode}`);
            }
            
            if (!requiredStartColor) {
              requiredStartColor = requiredLearningColor;
            }
            
            learningTrials = Math.floor(Math.random() * (maxLearningPhaseTrials - minLearningPhaseTrials + 1)) + minLearningPhaseTrials;
          }
          
          const sequence = generateValidCueSequence(episodeLength, requiredStartColor, null, learningTrials);
          episodeSequences.push(sequence);
          prevLastColor = sequence[sequence.length - 1];
          
          if (episode >= 2) {
            const startIdentity = sequence[0] === cueColors[0] ? 1 : 2;
            actualIdentities.push(startIdentity);
          }
        }
        
        const first4 = actualIdentities.slice(0, 4);
        const all8 = actualIdentities;
        
        if (first4.filter(x => x === 1).length !== 2 || first4.filter(x => x === 2).length !== 2) {
          throw new Error('First 4 not balanced');
        }
        if (all8.filter(x => x === 1).length !== 4 || all8.filter(x => x === 2).length !== 4) {
          throw new Error('All 8 not balanced');
        }
        
        return episodeSequences;
      } catch (e) {
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
    
    const firstCueIdentity = cueSequence[0] === cueColors[0] ? 1 : 2;
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
      const baseAngle = (startAngle + i * 0) % 360;
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
  const assignOutcomes = () => {
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
      
      for (const idx of selected) {
        outcomes[idx] = 0;
      }
    }
    
    return outcomes;
  };

  const outcomes = assignOutcomes();
  allTrials.forEach((trial, idx) => {
    trial.outcomeOccurred = outcomes[idx];
  });

  // Assign oddballs
  const assignOddballs = () => {
    const oddballs = allTrials.map(() => false);
    const episodeGroups = {};
    
    allTrials.forEach((trial, idx) => {
      if (!episodeGroups[trial.episode]) episodeGroups[trial.episode] = [];
      episodeGroups[trial.episode].push(idx);
    });
    
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
    
    return oddballs;
  };

  const oddballs = assignOddballs();
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

// Circular plot component
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
      
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
        const coords = angleToCoords(angle, radius + 20);
        return (
          <text
            key={`label-${angle}`}
            x={coords.x}
            y={coords.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-600 font-medium"
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
              Trial {trial.trialIndex} | Episode {trial.episode} | Trial {trial.trialInEpisode}/{trial.episodeLength}
              {'\n'}Angle: {trial.actualVectorAngle.toFixed(1)}°
              {'\n'}Identity: {trial.cueIdentity}
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

// Histogram of angle distribution
const AngleHistogram = ({ trials, selectedEpisode, selectedColor, width = 500, height = 300 }) => {
  const filteredTrials = trials.filter(t => {
    if (selectedEpisode && t.episode !== selectedEpisode) return false;
    if (selectedColor && t.cueColor !== selectedColor) return false;
    return true;
  });
  
  if (filteredTrials.length === 0) return <div className="text-center text-gray-500 py-20">No data to display</div>;
  
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
            width={Math.max(barWidth - 1, 1)}
            height={h}
            fill="#6366f1"
            opacity="0.7"
          >
            <title>{`${i * binSize}° - ${(i + 1) * binSize}°: ${count} trials`}</title>
          </rect>
        );
      })}
      
      {[0, Math.floor(maxCount/2), maxCount].map(tick => (
        <g key={`ytick-${tick}`}>
          <line x1={padding.left - 5} y1={yScale(tick)} x2={padding.left} y2={yScale(tick)} stroke="#374151" strokeWidth="1" />
          <text x={padding.left - 10} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" className="text-xs fill-gray-700">
            {tick}
          </text>
        </g>
      ))}
      
      {[0, 90, 180, 270, 360].map(angle => {
        const x = padding.left + (angle / 360) * plotWidth;
        return (
          <g key={`xtick-${angle}`}>
            <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#374151" strokeWidth="1" />
            <text x={x} y={height - padding.bottom + 20} textAnchor="middle" className="text-xs fill-gray-700">
              {angle}°
            </text>
          </g>
        );
      })}
      
      <text x={padding.left + plotWidth / 2} y={height - 5} textAnchor="middle" className="text-sm fill-gray-700 font-semibold">
        Angle (°)
      </text>
      
      <text x={15} y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`} className="text-sm fill-gray-700 font-semibold">
        Count
      </text>
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

// Main App Component
const App = () => {
  const [params, setParams] = useState({
    nEpisodes: 9,
    episodeAngleShiftCue1: 120,
    episodeAngleShiftCue2: 120,
    rule3Shift: 70,
    angleNoiseStd: 10,
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
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            Trial Generator & Visualization
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Play size={18} />
              Generate
            </button>
            <button
              onClick={handleDownload}
              disabled={!data}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              <Download size={18} />
              Download CSV
            </button>
            <button
              onClick={() => setShowSettings(s => !s)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              <Settings size={18} />
              Settings
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(params).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 mb-1">
                    {key}
                  </label>
                  <input
                    type="number"
                    value={value}
                    step="any"
                    onChange={e => handleParamChange(key, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <select
                  value={selectedEpisode ?? ''}
                  onChange={e =>
                    setSelectedEpisode(
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="">All Episodes</option>
                  {Array.from({ length: params.nEpisodes }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Episode {i + 1}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedColor ?? ''}
                  onChange={e =>
                    setSelectedColor(
                      e.target.value === '' ? null : e.target.value
                    )
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="">All Colors</option>
                  {data.cueColors.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <CircularPlot
                trials={data.trials}
                selectedEpisode={selectedEpisode}
                selectedColor={selectedColor}
              />
            </div>

            <div className="space-y-6">
              <AngleHistogram
                trials={data.trials}
                selectedEpisode={selectedEpisode}
                selectedColor={selectedColor}
              />
              <IdentityComparisonPlot
                trials={data.trials}
                cueColors={data.cueColors}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
