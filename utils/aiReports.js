(function (root, factory) {
  const api = factory()
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api
  }
  root.AIReportUtils = api
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

  function normalizeGoal(goal) {
    return String(goal || '')
      .toLowerCase()
      .replace(/-/g, '_')
      .trim()
  }

  function kcalFromMacros(macros) {
    return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9
  }

  function macroPercents(macros) {
    const kcal = Math.max(1, kcalFromMacros(macros))
    return {
      p: (macros.protein * 4) / kcal,
      c: (macros.carbs * 4) / kcal,
      f: (macros.fat * 9) / kcal
    }
  }

  function getGoalTargets(goal) {
    switch (normalizeGoal(goal)) {
      case 'lose_weight':
        return { p: 0.32, c: 0.33, f: 0.35, tol: 0.12 }
      case 'maintain_weight':
        return { p: 0.26, c: 0.44, f: 0.30, tol: 0.12 }
      case 'gain_weight':
        return { p: 0.24, c: 0.51, f: 0.25, tol: 0.12 }
      case 'gain_muscle':
        return { p: 0.30, c: 0.45, f: 0.25, tol: 0.10 }
      case 'stay_fit':
      default:
        return { p: 0.25, c: 0.45, f: 0.30, tol: 0.12 }
    }
  }

  function scoreMacroBalance(input) {
    const targets = getGoalTargets(input.userGoal)
    const actual = macroPercents(input.macros)
    const deviation = Math.abs(actual.p - targets.p) + Math.abs(actual.c - targets.c) + Math.abs(actual.f - targets.f)
    const raw = 1.5 - (deviation / (targets.tol * 3)) * 1.5
    return clamp(raw, 0, 1.5)
  }

  function scoreIngredientQuality(input) {
    const qualityMap = {
      poor: 0.25,
      fair: 0.5,
      good: 0.8,
      excellent: 1.0
    }

    let score = qualityMap[input.ingredientsQuality || 'fair'] ?? 0.5
    if (typeof input.fiber === 'number') {
      if (input.fiber >= 8) score += 0.1
      else if (input.fiber < 3) score -= 0.1
    }
    if (typeof input.sugar === 'number' && input.sugar > 20) score -= 0.1

    return clamp(score, 0, 1.0)
  }

  function scoreProcessingLevel(input) {
    const map = {
      low: 0.8,
      medium: 0.5,
      high: 0.2
    }
    return map[input.processedLevel || 'medium'] ?? 0.5
  }

  function scoreGoalAlignment(input) {
    const calories = Number(input.calories || 0)
    const protein = Number(input.macros?.protein || 0)
    const weight = Number(input.userWeightKg || 70)
    const proteinPerKg = protein / Math.max(1, weight)
    let score = 0.6

    switch (normalizeGoal(input.userGoal)) {
      case 'lose_weight':
        if (calories <= 700) score += 0.25
        if (proteinPerKg >= 0.35) score += 0.35
        break
      case 'gain_muscle':
        if (calories >= 550) score += 0.25
        if (proteinPerKg >= 0.4) score += 0.35
        break
      case 'gain_weight':
        if (calories >= 650) score += 0.25
        if (proteinPerKg >= 0.3) score += 0.35
        break
      case 'maintain_weight':
      case 'stay_fit':
      default:
        if (calories >= 450 && calories <= 800) score += 0.25
        if (proteinPerKg >= 0.3) score += 0.35
        break
    }

    return clamp(score, 0, 1.2)
  }

  function scorePortionControl(input) {
    const calories = Number(input.calories || 0)
    let score = 0.3

    if (typeof input.portionGrams === 'number') {
      if (input.portionGrams >= 300 && input.portionGrams <= 650) score = 0.5
      else if (input.portionGrams > 750 || input.portionGrams < 200) score = 0.2
      else score = 0.35
    } else {
      if (calories >= 400 && calories <= 800) score = 0.5
      else if (calories < 250 || calories > 1000) score = 0.2
      else score = 0.35
    }

    return clamp(score, 0, 0.5)
  }

  function calculateNutritionScore(input) {
    const macroBalance = scoreMacroBalance(input)
    const ingredientQuality = scoreIngredientQuality(input)
    const processingLevel = scoreProcessingLevel(input)
    const goalAlignment = scoreGoalAlignment(input)
    const portionControl = scorePortionControl(input)

    const total = clamp(macroBalance + ingredientQuality + processingLevel + goalAlignment + portionControl, 0, 5)

    let verdict = 'Needs Improvement'
    if (total >= 4.2) verdict = 'Excellent'
    else if (total >= 3.4) verdict = 'Good'
    else if (total >= 2.5) verdict = 'Fair'

    return {
      macroBalance: Number(macroBalance.toFixed(2)),
      ingredientQuality: Number(ingredientQuality.toFixed(2)),
      processingLevel: Number(processingLevel.toFixed(2)),
      goalAlignment: Number(goalAlignment.toFixed(2)),
      portionControl: Number(portionControl.toFixed(2)),
      total: Number(total.toFixed(2)),
      verdict
    }
  }

  return {
    clamp,
    normalizeGoal,
    kcalFromMacros,
    macroPercents,
    getGoalTargets,
    calculateNutritionScore,
    scoreMacroBalance,
    scoreIngredientQuality,
    scoreProcessingLevel,
    scoreGoalAlignment,
    scorePortionControl
  }
})
