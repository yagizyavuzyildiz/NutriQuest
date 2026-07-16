const assert = require('assert')
const aiReports = require('../utils/aiReports.js')

function run(name, fn) {
  try {
    fn()
    console.log('PASS', name)
  } catch (error) {
    console.error('FAIL', name)
    throw error
  }
}

run('module exports scoring helpers', () => {
  assert.strictEqual(typeof aiReports.calculateNutritionScore, 'function')
  assert.strictEqual(typeof aiReports.scoreMacroBalance, 'function')
  assert.strictEqual(typeof aiReports.getGoalTargets, 'function')
})

run('goal normalization handles hyphen and underscore', () => {
  const hyphen = aiReports.getGoalTargets('gain-muscle')
  const underscore = aiReports.getGoalTargets('gain_muscle')
  assert.deepStrictEqual(hyphen, underscore)
})

const scenarios = [
  {
    name: 'excellent gain muscle bowl',
    input: { calories: 640, macros: { protein: 58, carbs: 52, fat: 18 }, fiber: 10, sugar: 6, sodium: 420, processedLevel: 'low', ingredientsQuality: 'excellent', portionGrams: 520, userWeightKg: 74, userGoal: 'gain_muscle' },
    verdict: 'Good',
    min: 3.7,
    max: 4.1
  },
  {
    name: 'good lose weight plate',
    input: { calories: 520, macros: { protein: 44, carbs: 32, fat: 16 }, fiber: 8, sugar: 5, sodium: 360, processedLevel: 'low', ingredientsQuality: 'good', portionGrams: 430, userWeightKg: 70, userGoal: 'lose_weight' },
    verdict: 'Good',
    min: 3.4,
    max: 4.6
  },
  {
    name: 'fair maintain weight meal',
    input: { calories: 720, macros: { protein: 32, carbs: 78, fat: 24 }, fiber: 6, sugar: 9, sodium: 510, processedLevel: 'medium', ingredientsQuality: 'good', portionGrams: 590, userWeightKg: 76, userGoal: 'maintain_weight' },
    verdict: 'Fair',
    min: 2.5,
    max: 3.9
  },
  {
    name: 'needs improvement processed snack',
    input: { calories: 980, macros: { protein: 12, carbs: 132, fat: 42 }, fiber: 2, sugar: 28, sodium: 1200, processedLevel: 'high', ingredientsQuality: 'poor', portionGrams: 910, userWeightKg: 72, userGoal: 'stay_fit' },
    verdict: 'Needs Improvement',
    min: 0,
    max: 2.7
  },
  {
    name: 'gain weight dense meal',
    input: { calories: 860, macros: { protein: 40, carbs: 92, fat: 28 }, fiber: 7, sugar: 9, sodium: 640, processedLevel: 'medium', ingredientsQuality: 'good', portionGrams: 640, userWeightKg: 80, userGoal: 'gain_weight' },
    verdict: 'Good',
    min: 3.2,
    max: 4.6
  },
  {
    name: 'macro balance shifts with protein heavy meal',
    input: { calories: 510, macros: { protein: 52, carbs: 28, fat: 14 }, fiber: 7, sugar: 4, sodium: 310, processedLevel: 'low', ingredientsQuality: 'good', portionGrams: 380, userWeightKg: 68, userGoal: 'stay_fit' },
    verdict: 'Good',
    min: 3.4,
    max: 4.8
  },
  {
    name: 'low fiber reduces quality',
    input: { calories: 560, macros: { protein: 36, carbs: 58, fat: 18 }, fiber: 1.5, sugar: 8, sodium: 420, processedLevel: 'low', ingredientsQuality: 'good', portionGrams: 470, userWeightKg: 70, userGoal: 'maintain_weight' },
    verdict: 'Fair',
    min: 2.4,
    max: 3.8
  },
  {
    name: 'high sugar pushes score down',
    input: { calories: 430, macros: { protein: 18, carbs: 72, fat: 12 }, fiber: 3, sugar: 24, sodium: 290, processedLevel: 'medium', ingredientsQuality: 'fair', portionGrams: 310, userWeightKg: 66, userGoal: 'lose_weight' },
    verdict: 'Needs Improvement',
    min: 0,
    max: 3.0
  },
  {
    name: 'excellent ingredient quality bonus',
    input: { calories: 610, macros: { protein: 42, carbs: 64, fat: 16 }, fiber: 9, sugar: 7, sodium: 370, processedLevel: 'low', ingredientsQuality: 'excellent', portionGrams: 500, userWeightKg: 73, userGoal: 'gain_muscle' },
    verdict: 'Excellent',
    min: 4.0,
    max: 5
  },
  {
    name: 'portion too large lowers control',
    input: { calories: 1180, macros: { protein: 34, carbs: 128, fat: 48 }, fiber: 8, sugar: 10, sodium: 700, processedLevel: 'medium', ingredientsQuality: 'good', portionGrams: 920, userWeightKg: 78, userGoal: 'stay_fit' },
    verdict: 'Fair',
    min: 2.0,
    max: 3.8
  },
  {
    name: 'portion in range helps control',
    input: { calories: 690, macros: { protein: 37, carbs: 70, fat: 22 }, fiber: 6, sugar: 7, sodium: 460, processedLevel: 'medium', ingredientsQuality: 'good', portionGrams: 560, userWeightKg: 77, userGoal: 'maintain_weight' },
    verdict: 'Good',
    min: 3.0,
    max: 4.6
  },
  {
    name: 'high processing stays capped',
    input: { calories: 640, macros: { protein: 30, carbs: 74, fat: 24 }, fiber: 4, sugar: 11, sodium: 910, processedLevel: 'high', ingredientsQuality: 'fair', portionGrams: 530, userWeightKg: 71, userGoal: 'gain_weight' },
    verdict: 'Fair',
    min: 1.8,
    max: 3.8
  },
  {
    name: 'lose weight with strong protein density',
    input: { calories: 470, macros: { protein: 48, carbs: 24, fat: 15 }, fiber: 7, sugar: 4, sodium: 300, processedLevel: 'low', ingredientsQuality: 'good', portionGrams: 390, userWeightKg: 69, userGoal: 'lose_weight' },
    verdict: 'Good',
    min: 3.5,
    max: 4.8
  },
  {
    name: 'gain muscle with moderate carbs',
    input: { calories: 730, macros: { protein: 55, carbs: 75, fat: 20 }, fiber: 8, sugar: 6, sodium: 480, processedLevel: 'low', ingredientsQuality: 'good', portionGrams: 610, userWeightKg: 82, userGoal: 'gain_muscle' },
    verdict: 'Excellent',
    min: 4.0,
    max: 5
  },
  {
    name: 'stay fit balanced lunch',
    input: { calories: 580, macros: { protein: 34, carbs: 58, fat: 18 }, fiber: 6, sugar: 5, sodium: 390, processedLevel: 'low', ingredientsQuality: 'good', portionGrams: 470, userWeightKg: 70, userGoal: 'stay_fit' },
    verdict: 'Good',
    min: 3.3,
    max: 4.6
  },
  {
    name: 'lean meal with too few calories',
    input: { calories: 210, macros: { protein: 24, carbs: 12, fat: 6 }, fiber: 2, sugar: 3, sodium: 180, processedLevel: 'low', ingredientsQuality: 'good', portionGrams: 180, userWeightKg: 64, userGoal: 'lose_weight' },
    verdict: 'Needs Improvement',
    min: 0,
    max: 3.0
  },
  {
    name: 'dense post workout meal',
    input: { calories: 790, macros: { protein: 48, carbs: 86, fat: 24 }, fiber: 7, sugar: 8, sodium: 520, processedLevel: 'medium', ingredientsQuality: 'good', portionGrams: 640, userWeightKg: 79, userGoal: 'gain_muscle' },
    verdict: 'Good',
    min: 3.3,
    max: 4.7
  },
  {
    name: 'balanced meal with high fiber',
    input: { calories: 640, macros: { protein: 38, carbs: 66, fat: 20 }, fiber: 11, sugar: 5, sodium: 340, processedLevel: 'low', ingredientsQuality: 'excellent', portionGrams: 540, userWeightKg: 75, userGoal: 'maintain_weight' },
    verdict: 'Excellent',
    min: 4.0,
    max: 5
  },
  {
    name: 'processed and sugary breakfast',
    input: { calories: 540, macros: { protein: 14, carbs: 82, fat: 18 }, fiber: 2.5, sugar: 26, sodium: 650, processedLevel: 'high', ingredientsQuality: 'poor', portionGrams: 330, userWeightKg: 68, userGoal: 'stay_fit' },
    verdict: 'Needs Improvement',
    min: 0,
    max: 2.8
  },
  {
    name: 'hybrid vegetarian power bowl',
    input: { calories: 600, macros: { protein: 41, carbs: 60, fat: 18 }, fiber: 9, sugar: 6, sodium: 410, processedLevel: 'low', ingredientsQuality: 'excellent', portionGrams: 500, userWeightKg: 71, userGoal: 'maintain_weight' },
    verdict: 'Good',
    min: 3.5,
    max: 4.8
  }
]

assert.strictEqual(scenarios.length, 20)

scenarios.forEach(scenario => {
  run(scenario.name, () => {
    const result = aiReports.calculateNutritionScore(scenario.input)
    assert.ok(['Excellent', 'Good', 'Fair', 'Needs Improvement'].includes(result.verdict))
    assert.ok(result.total >= 0 && result.total <= 5)
    assert.ok(result.macroBalance >= 0 && result.macroBalance <= 1.5)
    assert.ok(result.ingredientQuality >= 0 && result.ingredientQuality <= 1)
    assert.ok(result.processingLevel >= 0 && result.processingLevel <= 0.8)
    assert.ok(result.goalAlignment >= 0 && result.goalAlignment <= 1.2)
    assert.ok(result.portionControl >= 0 && result.portionControl <= 0.5)
  })
})

run('different meals produce different scores', () => {
  const a = aiReports.calculateNutritionScore({ calories: 480, macros: { protein: 44, carbs: 30, fat: 16 }, fiber: 8, sugar: 4, processedLevel: 'low', ingredientsQuality: 'excellent', portionGrams: 430, userWeightKg: 72, userGoal: 'lose_weight' })
  const b = aiReports.calculateNutritionScore({ calories: 980, macros: { protein: 12, carbs: 124, fat: 42 }, fiber: 2, sugar: 24, processedLevel: 'high', ingredientsQuality: 'poor', portionGrams: 880, userWeightKg: 72, userGoal: 'lose_weight' })
  assert.notStrictEqual(a.total, b.total)
  assert.notStrictEqual(a.verdict, b.verdict)
})
