(function (global) {
  'use strict'

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  function normalizeNumber(value, fallback) {
    var n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  function normalizeGoal(goalId) {
    var raw = String(goalId || '').toLowerCase()
    if (!raw) return 'maintain-weight'
    return raw
  }

  function isMaleGender(genderValue) {
    var token = String(genderValue || '').toLowerCase().trim()
    return token === 'male' || token === 'm' || token.indexOf('erkek') >= 0
  }

  function normalizeActivityMultiplier(activityLevel) {
    var activity = String(activityLevel || '').toLowerCase()
    var map = {
      'not very active': 1.2,
      'sedentary': 1.2,
      'lightly active': 1.375,
      'moderately active': 1.5,
      'active': 1.6,
      'very active': 1.725
    }
    if (map[activity]) return map[activity]
    if (activity.indexOf('very active') >= 0) return 1.725
    if (activity.indexOf('moderately') >= 0) return 1.5
    if (activity.indexOf('active') >= 0) return 1.6
    return 1.2
  }

  function getMacroRatios(planId) {
    var ratiosByPlan = {
      'lose-weight': { protein: 0.30, carbs: 0.35, fat: 0.35 },
      'maintain-weight': { protein: 0.25, carbs: 0.45, fat: 0.30 },
      'gain-weight': { protein: 0.25, carbs: 0.50, fat: 0.25 },
      'gain-muscle': { protein: 0.30, carbs: 0.45, fat: 0.25 },
      'stay-fit': { protein: 0.25, carbs: 0.45, fat: 0.30 },
      'high-protein': { protein: 0.35, carbs: 0.35, fat: 0.30 },
      'mediterranean': { protein: 0.25, carbs: 0.45, fat: 0.30 },
      'vegetarian': { protein: 0.25, carbs: 0.50, fat: 0.25 }
    }
    return ratiosByPlan[normalizeGoal(planId)] || ratiosByPlan['maintain-weight']
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
      'vegetarian': 2.6
    }
    return waterByPlan[normalizeGoal(planId)] || 2.7
  }

  function getProteinMinPerKg(goalId) {
    var goal = normalizeGoal(goalId)
    if (goal === 'high-protein') return 2.2
    if (goal === 'gain-muscle') return 2.0
    if (goal === 'lose-weight') return 1.8
    if (goal === 'gain-weight') return 1.7
    return 1.6
  }

  function calculateBMR(params) {
    var age = normalizeNumber(params.age, 25)
    var heightCm = normalizeNumber(params.heightCm, 170)
    var weightKg = normalizeNumber(params.weightKg, 70)
    var gender = String(params.gender || params.sex || 'female')
    var sexAdjust = isMaleGender(gender) ? 5 : -161
    return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexAdjust)
  }

  function calculateTDEE(bmr, activityLevel) {
    var multiplier = normalizeActivityMultiplier(activityLevel)
    return Math.round(Number(bmr || 0) * multiplier)
  }

  function calculateTargetCalories(tdee, goalId, options) {
    var goal = normalizeGoal(goalId)
    var baseGoal = normalizeGoal(options && options.baseGoal)
    var adjusted = Number(tdee || 0)

    if (goal === 'lose-weight') adjusted = Math.round(adjusted * 0.82)
    else if (goal === 'maintain-weight') adjusted = Math.round(adjusted)
    else if (goal === 'gain-weight') adjusted = Math.round(adjusted * 1.12)
    else if (goal === 'gain-muscle') adjusted = Math.round(adjusted * 1.10)
    else if (goal === 'stay-fit') adjusted = Math.round(adjusted * (options && options.stayFitBias ? options.stayFitBias : 1.0))
    else if (goal === 'high-protein') {
      if (baseGoal === 'gain-weight' || baseGoal === 'gain-muscle') adjusted = Math.round(adjusted * 1.08)
      else adjusted = Math.round(adjusted)
    } else if (goal === 'mediterranean' || goal === 'vegetarian') {
      if (baseGoal === 'gain-weight' || baseGoal === 'gain-muscle') adjusted = Math.round(adjusted * 1.08)
      else if (baseGoal === 'lose-weight') adjusted = Math.round(adjusted * 0.9)
      else adjusted = Math.round(adjusted)
    }

    return clamp(adjusted, 1200, 6000)
  }

  function caloriesFromMacros(proteinG, carbsG, fatG) {
    return Math.round((proteinG * 4) + (carbsG * 4) + (fatG * 9))
  }

  function reconcileCaloriesWithMacros(input) {
    var targetCalories = Math.round(Number(input.targetCalories || 0))
    var proteinG = Math.round(Number(input.proteinG || 0))
    var carbsG = Math.round(Number(input.carbsG || 0))
    var fatG = Math.round(Number(input.fatG || 0))
    var proteinMinG = Math.max(0, Math.round(Number(input.proteinMinG || 0)))
    var fatMinG = Math.max(0, Math.round(Number(input.fatMinG || 0)))

    var kcal = caloriesFromMacros(proteinG, carbsG, fatG)
    var delta = targetCalories - kcal
    var guard = 0

    while (Math.abs(delta) > 10 && guard < 400) {
      guard += 1
      if (delta > 0) {
        if (delta >= 9) fatG += 1
        else carbsG += 1
      } else {
        if (carbsG > 0 && Math.abs(delta) >= 4) carbsG -= 1
        else if (fatG > fatMinG) fatG -= 1
        else if (proteinG > proteinMinG) proteinG -= 1
        else break
      }
      kcal = caloriesFromMacros(proteinG, carbsG, fatG)
      delta = targetCalories - kcal
    }

    return {
      proteinG: proteinG,
      carbsG: carbsG,
      fatG: fatG,
      kcalFromMacros: kcal,
      calorieDelta: delta
    }
  }

  function calculateMacros(input) {
    var calories = Math.round(Number(input.calories || 0))
    var ratios = input.ratios || getMacroRatios(input.goalId)
    var weightKg = normalizeNumber(input.weightKg, 70)
    var goalId = normalizeGoal(input.goalId)

    var proteinMinG = Math.round(weightKg * getProteinMinPerKg(goalId))
    var proteinMaxG = Math.round(weightKg * 2.2)
    var fatMinG = Math.round(weightKg * 0.6)

    var proteinG = Math.round((calories * Number(ratios.protein || 0.25)) / 4)
    var carbsG = Math.round((calories * Number(ratios.carbs || 0.45)) / 4)
    var fatG = Math.round((calories * Number(ratios.fat || 0.30)) / 9)

    if (proteinG < proteinMinG) proteinG = proteinMinG
    if (proteinG > proteinMaxG) proteinG = proteinMaxG
    if (fatG < fatMinG) fatG = fatMinG

    var rawKcal = caloriesFromMacros(proteinG, carbsG, fatG)
    if (rawKcal > calories) {
      var overflow = rawKcal - calories
      var reduceCarb = Math.min(carbsG, Math.ceil(overflow / 4))
      carbsG -= reduceCarb
      overflow -= reduceCarb * 4
      if (overflow > 0) {
        var reducibleFat = Math.max(0, fatG - fatMinG)
        var reduceFat = Math.min(reducibleFat, Math.ceil(overflow / 9))
        fatG -= reduceFat
      }
    }

    var reconciled = reconcileCaloriesWithMacros({
      targetCalories: calories,
      proteinG: proteinG,
      carbsG: carbsG,
      fatG: fatG,
      proteinMinG: proteinMinG,
      fatMinG: fatMinG
    })

    return {
      proteinG: reconciled.proteinG,
      carbsG: reconciled.carbsG,
      fatG: reconciled.fatG,
      kcalFromMacros: reconciled.kcalFromMacros,
      calorieDelta: reconciled.calorieDelta,
      proteinMinG: proteinMinG,
      fatMinG: fatMinG
    }
  }

  function calculatePlanNutrition(profile, planId) {
    var goal = normalizeGoal(planId)
    var baseGoal = normalizeGoal(profile && profile.goalId)
    var bmr = calculateBMR({
      age: profile && profile.age,
      gender: profile && (profile.gender || profile.sex),
      heightCm: profile && profile.heightCm,
      weightKg: profile && profile.weightKg
    })
    var tdee = calculateTDEE(bmr, profile && profile.activityLevel)
    var calories = calculateTargetCalories(tdee, goal, {
      baseGoal: baseGoal,
      stayFitBias: String(profile && profile.activityLevel || '').toLowerCase().indexOf('active') >= 0 ? 1.03 : 0.98
    })
    var ratios = getMacroRatios(goal)
    var macros = calculateMacros({
      calories: calories,
      ratios: ratios,
      weightKg: profile && profile.weightKg,
      goalId: goal
    })
    return {
      bmr: bmr,
      tdee: tdee,
      calories: calories,
      protein: macros.proteinG,
      carbs: macros.carbsG,
      fat: macros.fatG,
      kcalFromMacros: macros.kcalFromMacros,
      calorieDelta: macros.calorieDelta,
      waterTarget: getWaterTarget(goal),
      ratios: ratios,
      proteinMinG: macros.proteinMinG,
      fatMinG: macros.fatMinG
    }
  }

  var NutritionUtils = {
    calculateBMR: calculateBMR,
    calculateTDEE: calculateTDEE,
    calculateTargetCalories: calculateTargetCalories,
    calculateMacros: calculateMacros,
    reconcileCaloriesWithMacros: reconcileCaloriesWithMacros,
    calculatePlanNutrition: calculatePlanNutrition,
    getMacroRatios: getMacroRatios,
    normalizeActivityMultiplier: normalizeActivityMultiplier
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NutritionUtils
  }
  global.NutritionUtils = NutritionUtils
})(typeof window !== 'undefined' ? window : globalThis)
