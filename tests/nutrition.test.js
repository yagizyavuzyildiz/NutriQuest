const assert = require('assert')
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
  const bmr = nutrition.calculateBMR({ age: 30, gender: 'Male', heightCm: 180, weightKg: 82 })
  assert.strictEqual(bmr, 1800)
})

run('calculateBMR female baseline', () => {
  const bmr = nutrition.calculateBMR({ age: 28, gender: 'Female', heightCm: 165, weightKg: 65 })
  assert.strictEqual(bmr, 1380)
})

run('calculateTDEE moderate active', () => {
  const tdee = nutrition.calculateTDEE(1600, 'Moderately Active')
  assert.strictEqual(tdee, 2400)
})

run('target calories lose weight', () => {
  const kcal = nutrition.calculateTargetCalories(2400, 'lose-weight', { baseGoal: 'lose-weight' })
  assert.strictEqual(kcal, 1968)
})

run('target calories maintain', () => {
  const kcal = nutrition.calculateTargetCalories(2400, 'maintain-weight', { baseGoal: 'maintain-weight' })
  assert.strictEqual(kcal, 2400)
})

run('target calories gain weight', () => {
  const kcal = nutrition.calculateTargetCalories(2400, 'gain-weight', { baseGoal: 'gain-weight' })
  assert.strictEqual(kcal, 2688)
})

run('target calories gain muscle', () => {
  const kcal = nutrition.calculateTargetCalories(2400, 'gain-muscle', { baseGoal: 'gain-muscle' })
  assert.strictEqual(kcal, 2640)
})

run('macro consistency within +-10 kcal', () => {
  const macros = nutrition.calculateMacros({
    calories: 2235,
    ratios: nutrition.getMacroRatios('maintain-weight'),
    weightKg: 70,
    goalId: 'maintain-weight'
  })
  assert.ok(Math.abs(macros.calorieDelta) <= 10)
})

run('protein minimum 1.6g/kg applied', () => {
  const macros = nutrition.calculateMacros({
    calories: 1400,
    ratios: { protein: 0.15, carbs: 0.55, fat: 0.30 },
    weightKg: 80,
    goalId: 'maintain-weight'
  })
  assert.ok(macros.proteinG >= Math.round(80 * 1.6))
})

run('fat minimum 0.6g/kg applied', () => {
  const macros = nutrition.calculateMacros({
    calories: 1500,
    ratios: { protein: 0.45, carbs: 0.50, fat: 0.05 },
    weightKg: 82,
    goalId: 'gain-muscle'
  })
  assert.ok(macros.fatG >= Math.round(82 * 0.6))
})

run('high protein plan uses 35/35/30 base', () => {
  const ratios = nutrition.getMacroRatios('high-protein')
  assert.strictEqual(ratios.protein, 0.35)
  assert.strictEqual(ratios.carbs, 0.35)
  assert.strictEqual(ratios.fat, 0.30)
})

run('full plan nutrition output has reconciled calories', () => {
  const out = nutrition.calculatePlanNutrition({
    age: 33,
    gender: 'Male',
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
    gender: 'Female',
    heightCm: 165,
    weightKg: 65,
    activityLevel: 'Moderately Active',
    goalId: 'maintain-weight'
  }, 'vegetarian')
  assert.ok(out.calories > 1200)
  assert.ok(Math.abs(out.calorieDelta) <= 10)
})
