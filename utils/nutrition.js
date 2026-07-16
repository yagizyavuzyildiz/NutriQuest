(function (global) {
  'use strict'

  var KCAL = { protein: 4, carbs: 4, fat: 9 }
  var RATING_BADGE = { stars: '⭐⭐⭐⭐☆', label: '4.8 User Rating' }
  var UI_TAGS = ['AI Recommended', 'Based on your profile']

  var PLAN_PRESETS = {
    'lose-weight': {
      id: 'lose_weight',
      slug: 'lose-weight',
      calorieAdjustmentPct: -0.18,
      macroRatio: { protein: 0.32, carbs: 0.33, fat: 0.35 },
      proteinMultiplier: { min: 1.8, target: 2.0, max: 2.2 },
      carbCapGrams: null
    },
    'maintain-weight': {
      id: 'maintain_weight',
      slug: 'maintain-weight',
      calorieAdjustmentPct: 0.0,
      macroRatio: { protein: 0.26, carbs: 0.44, fat: 0.30 },
      proteinMultiplier: { min: 1.6, target: 1.8, max: 2.0 },
      carbCapGrams: null
    },
    'gain-weight': {
      id: 'gain_weight',
      slug: 'gain-weight',
      calorieAdjustmentPct: 0.10,
      macroRatio: { protein: 0.24, carbs: 0.51, fat: 0.25 },
      proteinMultiplier: { min: 1.6, target: 1.8, max: 2.0 },
      carbCapGrams: null
    },
    'gain-muscle': {
      id: 'gain_muscle',
      slug: 'gain-muscle',
      calorieAdjustmentPct: 0.08,
      macroRatio: { protein: 0.30, carbs: 0.45, fat: 0.25 },
      proteinMultiplier: { min: 1.8, target: 2.0, max: 2.2 },
      carbCapGrams: null
    },
    'stay-fit': {
      id: 'stay_fit',
      slug: 'stay-fit',
      calorieAdjustmentPct: 0.02,
      macroRatio: { protein: 0.25, carbs: 0.45, fat: 0.30 },
      proteinMultiplier: { min: 1.6, target: 1.8, max: 2.0 },
      carbCapGrams: null
    },
    'high-protein': {
      id: 'high_protein',
      slug: 'high-protein',
      calorieAdjustmentPct: 0.03,
      macroRatio: { protein: 0.36, carbs: 0.34, fat: 0.30 },
      proteinMultiplier: { min: 2.0, target: 2.2, max: 2.2 },
      carbCapGrams: null
    },
    'mediterranean': {
      id: 'mediterranean',
      slug: 'mediterranean',
      calorieAdjustmentPct: 0.0,
      macroRatio: { protein: 0.24, carbs: 0.46, fat: 0.30 },
      proteinMultiplier: { min: 1.6, target: 1.8, max: 2.0 },
      carbCapGrams: null
    },
    'vegan': {
      id: 'vegan',
      slug: 'vegan',
      calorieAdjustmentPct: 0.0,
      macroRatio: { protein: 0.22, carbs: 0.53, fat: 0.25 },
      proteinMultiplier: { min: 1.6, target: 1.8, max: 2.0 },
      carbCapGrams: null
    },
    'keto': {
      id: 'keto',
      slug: 'keto',
      calorieAdjustmentPct: 0.02,
      macroRatio: { protein: 0.30, carbs: 0.08, fat: 0.62 },
      proteinMultiplier: { min: 1.8, target: 2.0, max: 2.2 },
      carbCapGrams: 50
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  function normalizeNumber(value, fallback) {
    var n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  function normalizeGoal(goalId) {
    var raw = String(goalId || '').toLowerCase().trim()
    return PLAN_PRESETS[raw] ? raw : 'maintain-weight'
  }

  function isMaleGender(genderValue) {
    var token = String(genderValue || '').toLowerCase().trim()
    return token === 'male' || token === 'm' || token.indexOf('erkek') >= 0
  }

  function normalizeActivityMultiplier(activityLevel) {
    var activity = String(activityLevel || '').toLowerCase().trim()
    var map = {
      'not very active': 1.2,
      'sedentary': 1.2,
      'lightly active': 1.375,
      'moderately active': 1.55,
      'active': 1.55,
      'very active': 1.725,
      'athlete': 1.9
    }
    if (map[activity]) return map[activity]
    if (activity.indexOf('athlete') >= 0) return 1.9
    if (activity.indexOf('very active') >= 0) return 1.725
    if (activity.indexOf('moderately') >= 0) return 1.55
    if (activity.indexOf('active') >= 0) return 1.55
    return 1.2
  }

  function getPlanPreset(planId) {
    return PLAN_PRESETS[normalizeGoal(planId)]
  }

  function getMacroRatios(planId) {
    return getPlanPreset(planId).macroRatio
  }

  function getWaterTarget(planId) {
    var waterByPlan = {
      'lose-weight': 2.7,
      'maintain-weight': 2.8,
      'gain-weight': 3.2,
      'gain-muscle': 3.4,
      'stay-fit': 2.9,
      'high-protein': 3.3,
      'mediterranean': 2.8,
      'vegetarian': 2.6,
      'vegan': 2.8,
      'keto': 3.1
    }
    return waterByPlan[normalizeGoal(planId)] || 2.7
  }

  function calculateBMR(profile) {
    var age = normalizeNumber(profile && profile.age, 25)
    var heightCm = normalizeNumber(profile && (profile.heightCm || profile.height), 170)
    var weightKg = normalizeNumber(profile && (profile.weightKg || profile.weight), 70)
    var sexAdjust = isMaleGender(profile && (profile.sex || profile.gender)) ? 5 : -161
    var base = (10 * weightKg) + (6.25 * heightCm) - (5 * age)
    return Math.round(base + sexAdjust)
  }

  function calculateTDEE(profileOrBmr, activityLevel) {
    if (typeof profileOrBmr === 'number') {
      return Math.round(profileOrBmr * normalizeActivityMultiplier(activityLevel))
    }
    var profile = profileOrBmr || {}
    return Math.round(calculateBMR(profile) * normalizeActivityMultiplier(profile.activityMultiplier || profile.activityLevel))
  }

  function applyGoalCalories(tdee, adjustmentPct) {
    return Number(tdee || 0) * (1 + Number(adjustmentPct || 0))
  }

  function calculateTargetCalories(tdee, goalId, options) {
    var preset = getPlanPreset(goalId)
    var profile = options && options.profile ? options.profile : { weightKg: 70, activityMultiplier: 1.2 }
    var raw = applyGoalCalories(tdee, preset.calorieAdjustmentPct)
    return normalizeCalories(raw, profile)
  }

  function normalizeCalories(calories, profile) {
    var weightKg = normalizeNumber(profile && (profile.weightKg || profile.weight), 70)
    var multiplier = normalizeActivityMultiplier(profile && (profile.activityMultiplier || profile.activityLevel))
    var veryActive = multiplier >= 1.725
    var heavy = weightKg >= 95
    var min = Math.max(1400, Math.round(weightKg * 20))
    var max = veryActive && heavy ? 4200 : veryActive ? 3600 : 3200
    return Math.round(clamp(Number(calories || 0), min, max))
  }

  function caloriesFromMacros(proteinG, carbsG, fatG) {
    return Math.round((proteinG * KCAL.protein) + (carbsG * KCAL.carbs) + (fatG * KCAL.fat))
  }

  function reconcileCaloriesWithMacros(input) {
    var targetCalories = Math.round(Number(input.targetCalories || 0))
    var preset = input.preset || getPlanPreset(input.goalId)
    var proteinG = Math.round(Number(input.proteinG || 0))
    var carbsG = Math.round(Number(input.carbsG || 0))
    var fatG = Math.round(Number(input.fatG || 0))
    var proteinMinG = Math.round(Number(input.proteinMinG || 0))
    var fatMinG = Math.round(Number(input.fatMinG || 0))
    var ketoMinCarbs = normalizeGoal(preset.slug) === 'keto' ? 20 : 0

    var kcal = caloriesFromMacros(proteinG, carbsG, fatG)
    var diff = targetCalories - kcal
    var guard = 0

    while (Math.abs(diff) > 10 && guard < 500) {
      guard += 1
      if (diff > 0) {
        if (preset.carbCapGrams === null || carbsG < preset.carbCapGrams) carbsG += 1
        else fatG += 1
      } else {
        if (carbsG > ketoMinCarbs) carbsG -= 1
        else if (fatG > fatMinG) fatG -= 1
        else if (proteinG > proteinMinG) proteinG -= 1
        else break
      }
      kcal = caloriesFromMacros(proteinG, carbsG, fatG)
      diff = targetCalories - kcal
    }

    return {
      proteinG: proteinG,
      carbsG: carbsG,
      fatG: fatG,
      kcalFromMacros: kcal,
      calorieDelta: diff
    }
  }

  function computeGoalMatchPercent(profile, preset) {
    var age = normalizeNumber(profile && profile.age, 30)
    var weight = normalizeNumber(profile && (profile.weightKg || profile.weight), 70)
    var activity = normalizeActivityMultiplier(profile && (profile.activityMultiplier || profile.activityLevel))
    var hash = Math.round((age * 3) + (weight * 0.7) + (activity * 31) + (preset.macroRatio.protein * 100))
    return 82 + (Math.abs(hash) % 17)
  }

  function calculateMacros(calories, weightKg, presetInput) {
    var preset = presetInput || getPlanPreset('maintain-weight')
    var calorieValue = Math.round(Number(calories || 0))
    var kg = normalizeNumber(weightKg, 70)
    var proteinMin = Math.ceil(kg * clamp(preset.proteinMultiplier.min, 1.6, 2.2))
    var proteinTarget = Math.ceil(kg * clamp(preset.proteinMultiplier.target, 1.6, 2.2))
    var proteinMax = Math.ceil(kg * clamp(preset.proteinMultiplier.max, 1.6, 2.2))
    var fatMin = Math.ceil(kg * 0.6)

    var proteinFromRatio = Math.round((calorieValue * preset.macroRatio.protein) / KCAL.protein)
    var proteinG = normalizeGoal(preset.slug) === 'high-protein'
      ? Math.max(proteinFromRatio, proteinTarget)
      : Math.round((proteinFromRatio + proteinTarget) / 2)
    var carbsG = Math.round((calorieValue * preset.macroRatio.carbs) / KCAL.carbs)
    var fatG = Math.round((calorieValue * preset.macroRatio.fat) / KCAL.fat)

    proteinG = clamp(proteinG, proteinMin, proteinMax)
    fatG = Math.max(fatG, fatMin)

    if (preset.carbCapGrams !== null) {
      carbsG = Math.min(carbsG, preset.carbCapGrams)
      carbsG = Math.max(carbsG, 20)
    }

    var reconciled = reconcileCaloriesWithMacros({
      targetCalories: calorieValue,
      proteinG: proteinG,
      carbsG: carbsG,
      fatG: fatG,
      proteinMinG: proteinMin,
      fatMinG: fatMin,
      preset: preset
    })

    return {
      calories: calorieValue,
      proteinG: reconciled.proteinG,
      carbsG: reconciled.carbsG,
      fatG: reconciled.fatG,
      kcalFromMacros: reconciled.kcalFromMacros,
      calorieDelta: reconciled.calorieDelta,
      proteinMinG: proteinMin,
      fatMinG: fatMin
    }
  }

  function computePlanMacros(profile, presetInput) {
    var preset = typeof presetInput === 'string' ? getPlanPreset(presetInput) : (presetInput || getPlanPreset('maintain-weight'))
    var tdee = calculateTDEE(profile || {})
    var goalCaloriesRaw = applyGoalCalories(tdee, preset.calorieAdjustmentPct)
    var calories = normalizeCalories(goalCaloriesRaw, profile || {})
    var weightKg = normalizeNumber(profile && (profile.weightKg || profile.weight), 70)
    var macros = calculateMacros(calories, weightKg, preset)
    var goalMatchPercent = computeGoalMatchPercent(profile || {}, preset)

    return {
      calories: macros.calories,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      kcalFromMacros: macros.kcalFromMacros,
      calorieDelta: macros.calorieDelta,
      goalMatchPercent: goalMatchPercent,
      proteinMinG: macros.proteinMinG,
      fatMinG: macros.fatMinG
    }
  }

  function calculatePlanNutrition(profile, planId) {
    var normalized = normalizeGoal(planId)
    var preset = getPlanPreset(normalized)
    var result = computePlanMacros(profile || {}, preset)
    return {
      bmr: calculateBMR(profile || {}),
      tdee: calculateTDEE(profile || {}),
      calories: result.calories,
      protein: result.proteinG,
      carbs: result.carbsG,
      fat: result.fatG,
      kcalFromMacros: result.kcalFromMacros,
      calorieDelta: result.calorieDelta,
      goalMatchPercent: result.goalMatchPercent,
      waterTarget: getWaterTarget(normalized),
      ratios: preset.macroRatio,
      proteinMinG: result.proteinMinG,
      fatMinG: result.fatMinG,
      ratingBadge: RATING_BADGE,
      uiTags: UI_TAGS
    }
  }

  var NutritionUtils = {
    KCAL: KCAL,
    PLAN_PRESETS: PLAN_PRESETS,
    RATING_BADGE: RATING_BADGE,
    UI_TAGS: UI_TAGS,
    calculateBMR: calculateBMR,
    calculateTDEE: calculateTDEE,
    applyGoalCalories: applyGoalCalories,
    normalizeCalories: normalizeCalories,
    calculateTargetCalories: calculateTargetCalories,
    calculateMacros: calculateMacros,
    reconcileCaloriesWithMacros: reconcileCaloriesWithMacros,
    computePlanMacros: computePlanMacros,
    calculatePlanNutrition: calculatePlanNutrition,
    getMacroRatios: getMacroRatios,
    getPlanPreset: getPlanPreset,
    normalizeActivityMultiplier: normalizeActivityMultiplier
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NutritionUtils
  }
  global.NutritionUtils = NutritionUtils
})(typeof window !== 'undefined' ? window : globalThis)
