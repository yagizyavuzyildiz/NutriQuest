const assert = require('assert')
const fs = require('fs')
const path = require('path')
const nutrition = require('../utils/nutrition.js')

function run(name, fn) {
  try {
    fn()
    console.log('PASS', name)
  } catch (error) {
    console.error('FAIL', name)
    throw error
  }
}

run('calculateBMR male baseline', () => {
  const bmr = nutrition.calculateBMR({ age: 30, sex: 'male', heightCm: 180, weightKg: 82 })
  assert.strictEqual(bmr, 1800)
})

run('calculateBMR female baseline', () => {
  const bmr = nutrition.calculateBMR({ age: 28, sex: 'female', heightCm: 165, weightKg: 65 })
  assert.strictEqual(bmr, 1380)
})

run('calculateTDEE moderate active', () => {
  const tdee = nutrition.calculateTDEE({ age: 30, sex: 'male', heightCm: 175, weightKg: 70, activityLevel: 'Moderately Active' })
  assert.ok(tdee > 2300 && tdee < 2800)
})

run('macro consistency within +-10 kcal', () => {
  const preset = nutrition.getPlanPreset('maintain-weight')
  const macros = nutrition.calculateMacros(2235, 70, preset)
  assert.ok(Math.abs(macros.calorieDelta) <= 10, `delta ${macros.calorieDelta}`)
})

run('protein minimum 1.6g/kg applied', () => {
  const preset = nutrition.getPlanPreset('maintain-weight')
  const macros = nutrition.calculateMacros(1700, 80, preset)
  assert.ok(macros.proteinG >= Math.round(80 * 1.6))
})

run('fat minimum 0.6g/kg applied', () => {
  const preset = nutrition.getPlanPreset('gain-muscle')
  const macros = nutrition.calculateMacros(1500, 82, preset)
  assert.ok(macros.fatG >= Math.round(82 * 0.6))
})

run('high protein plan uses 36/34/30 base', () => {
  const ratios = nutrition.getMacroRatios('high-protein')
  assert.strictEqual(ratios.protein, 0.36)
  assert.strictEqual(ratios.carbs, 0.34)
  assert.strictEqual(ratios.fat, 0.30)
})

run('full plan nutrition output has reconciled calories', () => {
  const out = nutrition.calculatePlanNutrition({
    age: 33,
    sex: 'male',
    heightCm: 178,
    weightKg: 82,
    activityLevel: 'Active',
    goalId: 'gain-muscle'
  }, 'gain-muscle')
  assert.ok(out.calories > 2000)
  assert.ok(Math.abs(out.calorieDelta) <= 10)
  assert.ok(out.protein > 0 && out.carbs > 0 && out.fat > 0)
})

run('vegetarian plan output valid for lighter user', () => {
  const out = nutrition.calculatePlanNutrition({
    age: 26,
    sex: 'female',
    heightCm: 165,
    weightKg: 65,
    activityLevel: 'Moderately Active',
    goalId: 'maintain-weight'
  }, 'vegetarian')
  assert.ok(out.calories > 1200)
  assert.ok(Math.abs(out.calorieDelta) <= 10)
})

run('keto carb cap max 50 and min 20', () => {
  const out = nutrition.calculatePlanNutrition({
    age: 31,
    sex: 'male',
    heightCm: 180,
    weightKg: 88,
    activityLevel: 'Very Active',
    goalId: 'keto'
  }, 'keto')
  assert.ok(out.carbs <= 50)
  assert.ok(out.carbs >= 20)
})

run('same profile yields different macros across plans', () => {
  const profile = { age: 29, sex: 'male', heightCm: 175, weightKg: 70, activityLevel: 'Moderately Active', goalId: 'maintain-weight' }
  const lose = nutrition.calculatePlanNutrition(profile, 'lose-weight')
  const gain = nutrition.calculatePlanNutrition(profile, 'gain-weight')
  const highProtein = nutrition.calculatePlanNutrition(profile, 'high-protein')
  const proteinSet = new Set([lose.protein, gain.protein, highProtein.protein])
  assert.ok(proteinSet.size >= 2)
  assert.notStrictEqual(lose.carbs, highProtein.carbs)
  assert.notStrictEqual(lose.fat, highProtein.fat)
})

run('12 profile combinations produce realistic calories and consistency', () => {
  const profiles = [
    { age: 22, sex: 'male', heightCm: 175, weightKg: 70, activityLevel: 'Moderately Active' },
    { age: 22, sex: 'female', heightCm: 165, weightKg: 55, activityLevel: 'Lightly Active' },
    { age: 35, sex: 'male', heightCm: 182, weightKg: 95, activityLevel: 'Active' },
    { age: 42, sex: 'female', heightCm: 168, weightKg: 78, activityLevel: 'Sedentary' },
    { age: 28, sex: 'male', heightCm: 188, weightKg: 104, activityLevel: 'Very Active' },
    { age: 31, sex: 'female', heightCm: 172, weightKg: 82, activityLevel: 'Moderately Active' },
    { age: 26, sex: 'male', heightCm: 171, weightKg: 66, activityLevel: 'Not Very Active' },
    { age: 48, sex: 'female', heightCm: 160, weightKg: 64, activityLevel: 'Active' },
    { age: 39, sex: 'male', heightCm: 177, weightKg: 86, activityLevel: 'Very Active' },
    { age: 24, sex: 'female', heightCm: 170, weightKg: 60, activityLevel: 'Active' },
    { age: 52, sex: 'male', heightCm: 174, weightKg: 92, activityLevel: 'Moderately Active' },
    { age: 33, sex: 'female', heightCm: 167, weightKg: 72, activityLevel: 'Sedentary' }
  ]
  const plans = ['lose-weight', 'maintain-weight', 'gain-weight', 'gain-muscle', 'stay-fit', 'high-protein', 'mediterranean', 'vegan', 'keto']

  profiles.forEach(profile => {
    plans.forEach(plan => {
      const out = nutrition.calculatePlanNutrition(profile, plan)
      const maxAllowed = (nutrition.normalizeActivityMultiplier(profile.activityLevel) >= 1.725 && profile.weightKg >= 95) ? 4200 : (nutrition.normalizeActivityMultiplier(profile.activityLevel) >= 1.725 ? 3600 : 3200)
      assert.ok(out.calories <= maxAllowed)
      assert.ok(Math.abs(out.calorieDelta) <= 10)
    })
  })
})

run('ui badges exist in meal plan card template', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8')
  assert.ok(html.includes('⭐⭐⭐⭐☆'))
  assert.ok(html.includes('4.8 User Rating'))
  assert.ok(html.includes('AI Recommended'))
  assert.ok(html.includes('Based on your profile'))
})
