import type { PotionRecipe } from './types';

export const CORE_POTION_RECIPES: readonly PotionRecipe[] = [
  {
    id: 'witchs-breakfast-spell',
    number: 1,
    potionName: "Witch's Breakfast Spell",
    mealName: 'Egg and veg toast',
    ingredients: ['eggs', 'bread', 'spinach', 'tomato'],
    minutes: 10,
    packable: true,
    tags: ['breakfast'],
    sprite: 'toast',
    steps: [
      'Toast the bread until crisp while wilting spinach and diced tomato in a warm pan.',
      'Scramble or fry the eggs until set, then layer greens, tomato, and egg onto the toast.',
    ],
  },
  {
    id: 'midnight-energy-elixir',
    number: 2,
    potionName: 'Midnight Energy Elixir',
    mealName: 'Banana oat smoothie',
    ingredients: ['banana', 'oats', 'milk'],
    minutes: 5,
    packable: true,
    tags: ['breakfast'],
    sprite: 'cup',
    steps: [
      'Add peeled banana, rolled oats, and milk to a blender or shaker cup.',
      'Blend for 45 seconds until smooth and pour into a travel cup for campus.',
    ],
  },
  {
    id: 'enchanted-rice-cauldron',
    number: 3,
    potionName: 'Enchanted Rice Cauldron',
    mealName: 'Veggie egg fried rice',
    ingredients: ['rice', 'eggs', 'frozen veg', 'soy sauce'],
    minutes: 20,
    packable: false,
    tags: ['make-ahead'],
    sprite: 'bowl',
    steps: [
      'Warm frozen veg in a skillet for 4 minutes, push to the side, and scramble the eggs.',
      'Toss in cooked rice and soy sauce, stirring over medium-high heat for 4 minutes.',
    ],
  },
  {
    id: 'five-minute-revival-potion',
    number: 4,
    potionName: 'Five-Minute Revival Potion',
    mealName: 'Yogurt and fruit bowl',
    ingredients: ['yogurt', 'apple', 'oats'],
    minutes: 3,
    packable: true,
    tags: ['breakfast'],
    sprite: 'cup',
    steps: [
      'Core and dice the apple into bite-sized cubes.',
      'Spoon yogurt into a bowl or jar and top with diced apple and rolled oats.',
    ],
  },
  {
    id: 'crimson-cauldron-pasta',
    number: 5,
    potionName: 'Crimson Cauldron Pasta',
    mealName: 'Tomato spinach pasta',
    ingredients: ['pasta', 'tomato', 'spinach', 'onion'],
    minutes: 25,
    packable: false,
    tags: ['make-ahead'],
    sprite: 'bowl',
    steps: [
      'Boil pasta in salted water until tender, reserving a splash of cooking water.',
      'Saute chopped onion and tomato until saucy, wilt in spinach, and toss with drained pasta.',
    ],
  },
  {
    id: 'bean-bewitchment',
    number: 6,
    potionName: 'Bean Bewitchment',
    mealName: 'Bean and cheese quesadilla',
    ingredients: ['tortilla', 'beans', 'cheese'],
    minutes: 12,
    packable: true,
    tags: [],
    sprite: 'plate',
    steps: [
      'Rinse beans and mash lightly onto half of the tortilla, then top with shredded cheese.',
      'Fold and toast in a dry skillet for 3 minutes per side until golden and melted.',
    ],
  },
  {
    id: 'goblin-toast',
    number: 7,
    potionName: 'Goblin Toast',
    mealName: 'Peanut butter banana toast',
    ingredients: ['bread', 'peanut butter', 'banana'],
    minutes: 4,
    packable: true,
    tags: ['breakfast'],
    sprite: 'toast',
    steps: [
      'Toast the bread slices and spread evenly with peanut butter while still warm.',
      'Slice the banana into coins and press gently on top.',
    ],
  },
  {
    id: 'gravediggers-hash',
    number: 8,
    potionName: "Gravedigger's Hash",
    mealName: 'Potato and egg hash',
    ingredients: ['potato', 'eggs', 'onion'],
    minutes: 25,
    packable: false,
    tags: [],
    sprite: 'plate',
    steps: [
      'Dice potato small and pan-fry with chopped onion for 15 minutes until tender and browned.',
      'Make wells in the hash, crack in the eggs, and cover for 4 minutes until set.',
    ],
  },
  {
    id: 'wraith-wrap',
    number: 9,
    potionName: 'Wraith Wrap',
    mealName: 'Spinach egg wrap',
    ingredients: ['tortilla', 'eggs', 'spinach', 'cheese'],
    minutes: 10,
    packable: true,
    tags: ['breakfast'],
    sprite: 'plate',
    steps: [
      'Scramble the eggs with a handful of spinach until just set.',
      'Spoon warm eggs and cheese onto a tortilla, roll tightly, and sear seam-side down.',
    ],
  },
  {
    id: 'root-cellar-broth',
    number: 10,
    potionName: 'Root Cellar Broth',
    mealName: 'Carrot and rice soup',
    ingredients: ['rice', 'carrot', 'onion'],
    minutes: 30,
    packable: false,
    tags: ['make-ahead'],
    sprite: 'soup',
    steps: [
      'Dice onion and carrot and soften in a pot for 5 minutes with a pinch of salt.',
      'Add rice and 3 cups of water, then simmer gently for 20 minutes until tender.',
    ],
  },
  {
    id: 'sleeping-draught',
    number: 11,
    potionName: 'Sleeping Draught',
    mealName: 'Overnight oats',
    ingredients: ['oats', 'milk', 'banana'],
    minutes: 5,
    packable: true,
    tags: ['breakfast', 'make-ahead', 'wind-down'],
    sprite: 'cup',
    steps: [
      'Mash half the banana in a jar and stir in rolled oats and milk.',
      'Top with remaining banana slices, seal, and chill overnight (or enjoy after 10 minutes).',
    ],
  },
  {
    id: 'cauldron-chili',
    number: 12,
    potionName: 'Cauldron Chili',
    mealName: 'Bean and tomato chili',
    ingredients: ['beans', 'tomato', 'onion', 'rice'],
    minutes: 30,
    packable: false,
    tags: ['make-ahead'],
    sprite: 'soup',
    steps: [
      'Cook diced onion in a pot until translucent, then stir in chopped tomato and rinsed beans.',
      'Simmer for 20 minutes until thick and spoon over warm cooked rice.',
    ],
  },
  {
    id: 'molten-moon-melt',
    number: 13,
    potionName: 'Molten Moon Melt',
    mealName: 'Cheese and tomato toastie',
    ingredients: ['bread', 'cheese', 'tomato'],
    minutes: 8,
    packable: true,
    tags: [],
    sprite: 'toast',
    steps: [
      'Layer sliced tomato and cheese between two slices of bread.',
      'Toast in a pan for 3 to 4 minutes per side until the bread is crisp and cheese melts.',
    ],
  },
  {
    id: 'ghost-omelette',
    number: 14,
    potionName: 'Ghost Omelette',
    mealName: 'Spinach cheese omelette',
    ingredients: ['eggs', 'spinach', 'cheese'],
    minutes: 10,
    packable: false,
    tags: ['breakfast'],
    sprite: 'plate',
    steps: [
      'Beat eggs in a mug and pour into a warm non-stick pan over medium-low heat.',
      'Scatter spinach and cheese over one half, fold once set, and slide onto a plate.',
    ],
  },
  {
    id: 'orchard-slaw',
    number: 15,
    potionName: 'Orchard Slaw',
    mealName: 'Carrot apple yogurt slaw',
    ingredients: ['carrot', 'apple', 'yogurt'],
    minutes: 5,
    packable: true,
    tags: ['make-ahead', 'focus'],
    sprite: 'bowl',
    steps: [
      'Grate or julienne the washed carrot and crisp apple into a mixing bowl.',
      'Fold in spoonfuls of yogurt until lightly coated and pack in a container if heading out.',
    ],
  },
  {
    id: 'cursed-potato-soup',
    number: 16,
    potionName: 'Cursed Potato Soup',
    mealName: 'Creamy potato soup',
    ingredients: ['potato', 'onion', 'milk'],
    minutes: 30,
    packable: false,
    tags: ['make-ahead'],
    sprite: 'soup',
    steps: [
      'Simmer diced potato and onion in just enough water to cover for 18 minutes until soft.',
      'Mash half the potatoes in the pot for thickness, stir in milk, and warm gently without boiling.',
    ],
  },
  {
    id: 'dead-mans-rice-and-beans',
    number: 17,
    potionName: "Dead Man's Rice and Beans",
    mealName: 'Rice and beans',
    ingredients: ['rice', 'beans', 'onion', 'tomato'],
    minutes: 25,
    packable: false,
    tags: ['make-ahead'],
    sprite: 'bowl',
    steps: [
      'Saute chopped onion and diced tomato in a skillet until softened.',
      'Stir in rinsed beans and cooked rice with a splash of water, simmering 10 minutes until flavorful.',
    ],
  },
];

export const POTION_RECIPES: readonly PotionRecipe[] = CORE_POTION_RECIPES;

const mutableRecipesById: Record<string, PotionRecipe> = {};
for (const r of CORE_POTION_RECIPES) {
  mutableRecipesById[r.id] = r;
}

export const RECIPE_BY_ID: Readonly<Record<string, PotionRecipe>> =
  mutableRecipesById;

export function registerCustomRecipes(recipes: readonly PotionRecipe[]): void {
  for (const r of recipes) {
    mutableRecipesById[r.id] = r;
  }
}

export function getAllPotionRecipes(): PotionRecipe[] {
  const coreIds = new Set(CORE_POTION_RECIPES.map((r) => r.id));
  const custom = Object.values(mutableRecipesById).filter(
    (r) => !coreIds.has(r.id)
  );
  return [...CORE_POTION_RECIPES, ...custom];
}
