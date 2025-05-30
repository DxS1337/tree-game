// Telegram WebApp initialization
let tg = window.Telegram.WebApp;
let tg;
if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    tg = Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
} else {
    console.warn('Telegram WebApp не обнаружен. Режим совместимости.');
    tg = { 
        WebApp: { 
            platform: 'unknown', 
            expand: () => {}, 
            showPopup: () => {},
            colorScheme: 'light'
        } 
    };
}

function initTelegramWebApp() {
  if (tg) {
    tg.expand(); // Развернуть приложение на весь экран
    tg.enableClosingConfirmation(); // Подтверждение перед закрытием
    
    // Установка цвета фона
    tg.setHeaderColor('#2e7d32');
    tg.setBackgroundColor('#f5f5f5');
    
    // Обработчик события изменения размера
    tg.onEvent('viewportChanged', updateViewport);
    updateViewport();
  }
}

function updateViewport() {
  const viewportHeight = tg?.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty('--tg-viewport-height', `${viewportHeight}px`);
}

// Константы игры
const CONSTANTS = {
    BASE_ENERGY_COST: 1,
    BASE_XP_GAIN: 2,
    BASE_COIN_REWARD: 1,
    DAILY_CHEST_COOLDOWN: 24 * 60 * 60 * 1000,
    PREMIUM_CHEST_PRICE: 200,
    XP_MULTIPLIER: 0.1,
    ENERGY_REGEN_TIME: 10 * 60 * 1000,
    DEFAULT_USERNAME: "Игрок",
    THEME_MODES: ['auto', 'light', 'dark'],
    GARDEN_SLOT_COST: 1000,
    TREE_DEATH_TIME: 7 * 24 * 60 * 60 * 1000, // 7 дней в мс
    TREE_GROWTH_STAGES: ['🌱', '🌿', '🌳', '🌲'],
    TREE_GROWTH_XP: [0, 5, 10, 20], // XP за каждый уровень роста
    SKILL_POINT_CHANCE: 0.1, // 10% шанс получить очко навыка при поливе
    BASE_SKILL_POINTS: 1 // Базовое количество очков за уровень
};

// Состояние игры
const gameState = {
    level: 1,
    xp: 0,
    energy: 5,
    maxEnergy: 5,
    coins: 0,
    target: 1,
    planted: 0,
    nextLevelXP: 10,
    openingChest: false,
    lastSave: 0,
    energyChanged: false,
    coinsChanged: false,
    activeTreeSlot: null, // Активный слот для полива
    gardenSlots: {
        1: { 
            unlocked: true, 
            tree: null,
            lastWatered: null,
            growthStage: 0,
            xp: 0
        },
        2: { 
            unlocked: false, 
            tree: null,
            lastWatered: null,
            growthStage: 0,
            xp: 0
        },
        3: { 
            unlocked: false, 
            tree: null,
            lastWatered: null,
            growthStage: 0,
            xp: 0
        }
    },
    profile: {
        username: CONSTANTS.DEFAULT_USERNAME,
        themeMode: 'auto',
        achievements: []
    },
    upgrades: {
        energyCap: { name: "Увеличение энергии", description: "+1 к максимальной энергии", price: 50, maxLevel: 5, currentLevel: 0 },
        xpBoost: { name: "Бонус опыта", description: "+25% XP за полив", price: 75, maxLevel: 3, currentLevel: 0 },
        plantReward: { name: "Награда за посадку", description: "+1 монета за посадку", price: 60, maxLevel: 4, currentLevel: 0 },
        waterEfficiency: { name: "Эффективность полива", description: "Полив тратит на 0.2 меньше энергии", price: 80, maxLevel: 5, currentLevel: 0 },
        plantEfficiency: { name: "Эффективность посадки", description: "Посадка тратит на 0.5 меньше энергии", price: 100, maxLevel: 3, currentLevel: 0 },
        coinMultiplier: { name: "Множитель монет", description: "+10% к получаемым монетам", price: 120, maxLevel: 5, currentLevel: 0 },
        xpMultiplier: { name: "Множитель опыта", description: "+10% к получаемому опыту", price: 150, maxLevel: 3, currentLevel: 0 },
        dailyBonus: { name: "Ежедневный бонус", description: "+1 к наградам из ежедневного сундука", price: 200, maxLevel: 2, currentLevel: 0 },
        premiumDiscount: { name: "Скидка на премиум", description: "-10% к цене премиум сундуков", price: 180, maxLevel: 2, currentLevel: 0 }
    },
    skills: {
        gardening: {
            points: 0,
            upgrades: {
                extraSlot: {
                    name: "Доп. слот",
                    currentLevel: 0,
                    maxLevel: 3,
                    cost: 1,
                    effect: 1,
                    description: "Открывает дополнительный слот для деревьев"
                },
                fasterGrowth: {
                    name: "Быстрый рост",
                    currentLevel: 0,
                    maxLevel: 5,
                    cost: 1,
                    effect: 0.2,
                    description: "Увеличивает скорость роста деревьев на 20%"
                }
            }
        },
        inventory: {
            points: 0,
            upgrades: {
                exemFasterMatch: {
                    name: "Быстрое сопоставление",
                    currentLevel: 0,
                    maxLevel: 5,
                    cost: 1,
                    effect: 0.1,
                    description: "Увеличивает скорость работы с инвентарем"
                },
                quickHands: {
                    name: "Ловкие руки",
                    currentLevel: 0,
                    maxLevel: 3,
                    cost: 2,
                    effect: 0.15,
                    description: "Увеличивает скорость взаимодействия",
                    required: { skill: "exemFasterMatch", level: 2 }
                },
                organized: {
                    name: "Организованное пространство",
                    currentLevel: 0,
                    maxLevel: 4,
                    cost: 3,
                    effect: 0.2,
                    description: "Увеличивает вместимость инвентаря",
                    required: { skill: "quickHands", level: 1 }
                }
            }
        }
    },
    chests: {
        daily: {
            lastOpened: 0,
            cooldown: CONSTANTS.DAILY_CHEST_COOLDOWN,
            dropRates: {
                common: { 
                    chance: 60, 
                    emoji: '🌿', 
                    bonus: { xp: 2, coins: 5 }, 
                    name: "Обычный",
                    rarity: 'common',
                    description: "Небольшая награда за ежедневное посещение"
                },
                rare: { 
                    chance: 30, 
                    emoji: '🌳', 
                    bonus: { xp: 5, coins: 10 }, 
                    name: "Редкий",
                    rarity: 'rare',
                    description: "Хорошая награда для мотивации"
                },
                epic: { 
                    chance: 10, 
                    emoji: '🌲', 
                    bonus: { xp: 10, coins: 20, energy: 1 }, 
                    name: "Эпический",
                    rarity: 'epic',
                    description: "Отличная награда! Продолжайте в том же духе!"
                }
            }
        },
        premium: {
            price: CONSTANTS.PREMIUM_CHEST_PRICE,
            pityCounter: 0,
            dropRates: {
                oak: { 
                    chance: 40, 
                    emoji: '🌳', 
                    bonus: { xp: 5 }, 
                    name: "Саженец Дуба",
                    rarity: 'uncommon',
                    description: "Молодой дуб приносит опыт"
                },
                golden: { 
                    chance: 30, 
                    emoji: '💰', 
                    bonus: { coins: 20 }, 
                    name: "Мешочек Золота",
                    rarity: 'rare',
                    description: "Блестящая золотая награда"
                },
                magic: { 
                    chance: 20, 
                    emoji: '🔮', 
                    bonus: { discount: 0.1 }, 
                    name: "Магический Шар",
                    rarity: 'epic',
                    description: "Магическая сила снижает цены в магазине"
                },
                elder: { 
                    chance: 10, 
                    emoji: '🍂', 
                    bonus: { energy: 2 }, 
                    name: "Древний Листок",
                    rarity: 'legendary',
                    description: "Древняя мудрость даёт дополнительную энергию"
                }
            }
        }
    },
    achievementsData: [
        { id: 'first-tree', title: "Первое дерево", description: "Посадите ваше первое дерево", icon: "🌱", unlocked: false },
        { id: 'trader', title: "Биржевой новичок", description: "Заработайте 100 монет", icon: "📈", unlocked: false },
        { id: 'recruiter', title: "Вербовщик", description: "Пригласите 3 друзей", icon: "🫂", unlocked: false },
        { id: 'expert', title: "Эксперт", description: "Достигните 10 уровня", icon: "🏆", unlocked: false },
        { id: 'collector', title: "Коллекционер", description: "Откройте все сундуки", icon: "🎁", unlocked: false },
        { id: 'gardener', title: "Садовник", description: "Разблокируйте все слоты в саду", icon: "🌻", unlocked: false }
    ]
};

// Инициализация достижений
function initAchievements() {
    gameState.achievementsData.forEach(ach => {
        ach.unlocked = gameState.profile.achievements.includes(ach.id);
    });
}

// Очередь уведомлений
const notificationQueue = [];
let isNotificationShowing = false;

// DOM элементы
const elements = {
    tree: document.getElementById('tree'),
    energyDisplay: document.getElementById('energy'),
    maxEnergyDisplay: document.getElementById('max-energy'),
    coins: document.getElementById('coins'),
    target: document.getElementById('target'),
    progressPercent: document.getElementById('progress-percent'),
    progressBar: document.getElementById('progress-bar'),
    energyBar: document.getElementById('energy-bar'),
    currentLevel: document.getElementById('current-level'),
    nextLevel: document.getElementById('next-level'),
    waterBtn: document.getElementById('water-btn'),
    plantBtn: document.getElementById('plant-btn'),
    skillsNav: document.getElementById('skills-nav'),
    shopNav: document.getElementById('shop-nav'),
    homeNav: document.getElementById('home-nav'),
    gamepadNav: document.getElementById('gamepad-nav'),
    profileNav: document.getElementById('profile-nav'),
    inventoryPoints: document.getElementById('inventory-points'),
    upgradeExem: document.getElementById('upgrade-exem'),
    upgradeQuickHands: document.getElementById('upgrade-quick-hands'),
    upgradeOrganized: document.getElementById('upgrade-organized'),
    shopItems: document.getElementById('shop-items'),
    adminBtn: document.getElementById('admin-btn'),
    adminPanel: document.getElementById('admin-panel'),
    resetBtn: document.getElementById('reset-btn'),
    setLevel: document.getElementById('set-level'),
    setXp: document.getElementById('set-xp'),
    setEnergy: document.getElementById('set-energy'),
    setCoins: document.getElementById('set-coins'),
    setTileValue: document.getElementById('set-tile-value'),
    addTileBtn: document.getElementById('add-tile-btn'),
    addBlockBtn: document.getElementById('add-block-btn'),
    applyBtn: document.getElementById('apply-btn'),
    chestMenuBtn: document.getElementById('chest-menu-btn'),
    chestMenu: document.getElementById('chest-menu'),
    dailyTimer: document.getElementById('daily-timer'),
    notification: document.getElementById('notification'),
    rewardModal: document.getElementById('reward-modal'),
    rewardEmoji: document.getElementById('reward-emoji'),
    rewardName: document.getElementById('reward-name'),
    rewardDescription: document.getElementById('reward-description'),
    rewardBonus: document.getElementById('reward-bonus'),
    game2048Card: document.getElementById('game-2048'),
    game2048Container: document.getElementById('game-2048-container'),
    game2048Board: document.getElementById('game-2048-board'),
    game2048Score: document.getElementById('game-2048-score'),
    game2048Restart: document.getElementById('game-2048-restart'),
    game2048Close: document.getElementById('game-2048-close'),
    tileValueDisplay: document.getElementById('tile-value-display'),
    username: document.getElementById('username'),
    themeToggle: document.getElementById('theme-toggle'),
    allAchievements: document.getElementById('all-achievements'),
    unlockedAchievements: document.getElementById('unlocked-achievements'),
    gardenSlots: document.getElementById('garden-slots'),
    profileBtn: document.getElementById('profile-btn')
};

// Инициализация игры
function initGame() {
    applyTheme();
    setupEventListeners();
    loadGame();
    initAchievements();
    updateUI();
    updateChestTimer();
    renderSkills();
    renderShop();
    renderAchievements();
    updateGardenSlotsUI();
    initTelegramWebApp();

    elements.rewardModal.style.display = 'none';
    checkTreeHealth();
    
    // Добавляем кнопку "Поделиться" если в Telegram
    if (tg?.platform !== 'unknown') {
        addShareButton();
    }
    
    // Запускаем таймеры
    setInterval(updateChestTimer, 60000);
    setInterval(regenerateEnergy, CONSTANTS.ENERGY_REGEN_TIME);
    setInterval(checkTreeHealth, 24 * 60 * 60 * 1000); // Проверка здоровья деревьев раз в день
}

// Применение темы
function applyTheme() {
    const mode = gameState.profile.themeMode;
    const isDark = mode === 'dark' || (mode === 'auto' && tg?.colorScheme === 'dark');
    
    document.body.classList.toggle('dark-theme', isDark);
    
    // Обновляем переключатель темы
    if (elements.themeToggle) {
        elements.themeToggle.checked = isDark;
    }
}

// Добавление кнопки "Поделиться"
function addShareButton() {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-btn';
    shareBtn.innerHTML = '🔗';
    shareBtn.title = 'Поделиться игрой';
    shareBtn.addEventListener('click', shareGame);
    document.body.appendChild(shareBtn);
}

// Функция "Поделиться"
function shareGame() {
      if (tg) {
    tg.shareLink(
      `https://t.me/${tg.initDataUnsafe.user?.username || 'ECO_THREE_bot'}`,
      'Присоединяйся к ECO_THREE - выращивай деревья и зарабатывай монеты! 🌳'
    );
  }
}


// Настройка обработчиков событий
function setupEventListeners() {
    // Основные кнопки
    elements.waterBtn?.addEventListener('click', waterTree);
    elements.plantBtn?.addEventListener('click', plantTree);
    
    elements.themeToggle?.addEventListener('change', function() {
        gameState.profile.themeMode = this.checked ? 'dark' : 'light';
        applyTheme();
        saveGame();
    });
    
    // Навигация
    elements.skillsNav?.addEventListener('click', () => showContentSection('skills-content'));
    elements.shopNav?.addEventListener('click', () => showContentSection('shop-content'));
    elements.homeNav?.addEventListener('click', () => showContentSection('home-content'));
    elements.gamepadNav?.addEventListener('click', () => showContentSection('games-content'));
    elements.profileNav?.addEventListener('click', () => showContentSection('profile-content'));
    
    // Навыки
    elements.upgradeExem?.addEventListener('click', () => upgradeSkill('inventory', 'exemFasterMatch'));
    elements.upgradeQuickHands?.addEventListener('click', () => upgradeSkill('inventory', 'quickHands'));
    elements.upgradeOrganized?.addEventListener('click', () => upgradeSkill('inventory', 'organized'));
    
    // Админ-панель
    elements.adminBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.adminPanel?.classList.toggle('show');
    });
    elements.resetBtn?.addEventListener('click', resetGame);
    elements.applyBtn?.addEventListener('click', applyAdminSettings);
    elements.addBlockBtn?.addEventListener('click', () => {
        if (game2048.isPlaying) {
            game2048.addSpecificTile(2048);
            game2048.updateUI();
        }
    });
    elements.addTileBtn?.addEventListener('click', () => {
        const value = parseInt(elements.setTileValue?.value) || 2;
        if (game2048.isPlaying) {
            game2048.addSpecificTile(value);
            game2048.updateUI();
        }
    });
    elements.setTileValue?.addEventListener('input', function() {
        elements.tileValueDisplay.textContent = this.value;
    });
    
    // Сундуки
    elements.chestMenuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.chestMenu?.classList.toggle('show');
        updateChestTimer();
    });
    
    document.querySelectorAll('.chest-option').forEach(option => {
        option.addEventListener('click', function() {
            if (gameState.openingChest) return;
            openChest(this.dataset.type);
            elements.chestMenu?.classList.remove('show');
        });
    });
    
    // Игры
    elements.game2048Card?.addEventListener('click', () => game2048.start());
    elements.game2048Restart?.addEventListener('click', () => game2048.start());
    elements.game2048Close?.addEventListener('click', () => game2048.close());
    
    // Профиль
    elements.username?.addEventListener('change', function() {
        gameState.profile.username = this.value || CONSTANTS.DEFAULT_USERNAME;
        saveGame();
    });
    
    // Табы достижений
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.achievement-list').forEach(list => {
                list.classList.add('hidden');
            });
            
            document.getElementById(`${this.dataset.tab}-achievements`).classList.remove('hidden');
        });
    });

    // Клик вне модальных окон
    window.addEventListener('click', (event) => {
        if (!event.target.closest('.admin-panel') && !event.target.closest('.admin-btn')) {
            elements.adminPanel?.classList.remove('show');
        }
        if (!event.target.closest('.chest-menu') && !event.target.closest('.chest-menu-btn')) {
            elements.chestMenu?.classList.remove('show');
        }
        if (!event.target.closest('.reward-modal') && event.target !== elements.rewardModal) {
            elements.rewardModal.style.display = 'none';
        }
    });

    // Обработка клавиш для 2048
    document.addEventListener('keydown', (e) => {
        if (!game2048.isPlaying || !elements.game2048Container || elements.game2048Container.style.display !== 'block') return;
        
        switch(e.key) {
            case 'ArrowLeft': game2048.move('left'); break;
            case 'ArrowUp': game2048.move('up'); break;
            case 'ArrowRight': game2048.move('right'); break;
            case 'ArrowDown': game2048.move('down'); break;
            default: return;
        }
        e.preventDefault();
    });

    // Закрытие модальных окон
    elements.rewardModal?.querySelector('.close').addEventListener('click', () => {
        elements.rewardModal.style.display = 'none';
    });
    elements.rewardModal?.querySelector('.btn').addEventListener('click', () => {
        elements.rewardModal.style.display = 'none';
    });
}

// Показать секцию контента
function showContentSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navBtnMap = {
        'home-content': 'home-nav',
        'shop-content': 'shop-nav',
        'skills-content': 'skills-nav',
        'games-content': 'gamepad-nav',
        'profile-content': 'profile-nav'
    };
    
    const navBtnId = navBtnMap[sectionId];
    if (navBtnId) {
        const navBtn = document.getElementById(navBtnId);
        if (navBtn) navBtn.classList.add('active');
    }
}

// Основные игровые функции
function waterTree() {
    if (!gameState.activeTreeSlot) {
        showNotification("Выберите дерево для полива!");
        return;
    }
    
    const slot = gameState.gardenSlots[gameState.activeTreeSlot];
    if (!slot.tree) {
        showNotification("В этом слоте нет дерева!");
        return;
    }
    
    let energyCost = CONSTANTS.BASE_ENERGY_COST;
    if (gameState.upgrades.waterEfficiency.currentLevel > 0) {
        energyCost = Math.max(0.2, energyCost - (0.2 * gameState.upgrades.waterEfficiency.currentLevel));
    }
    
    if (gameState.energy < energyCost) {
        showNotification(`Нужно ${energyCost} энергии!`);
        return;
    }
    
    gameState.energy -= energyCost;
    gameState.energyChanged = true;
    
    // Обновляем время последнего полива
    slot.lastWatered = Date.now();
    
    // Увеличиваем стадию роста (если не максимальная)
    if (slot.growthStage < CONSTANTS.TREE_GROWTH_STAGES.length - 1) {
        slot.growthStage++;
        slot.xp += CONSTANTS.TREE_GROWTH_XP[slot.growthStage];
        gameState.xp += CONSTANTS.TREE_GROWTH_XP[slot.growthStage];
        showNotification(`Дерево выросло до ${slot.growthStage + 1} уровня! +${CONSTANTS.TREE_GROWTH_XP[slot.growthStage]}XP`);
    } else {
        // Дерево максимального уровня - даем монеты
        let coinsEarned = 5;
        if (gameState.upgrades.coinMultiplier.currentLevel > 0) {
            coinsEarned = Math.floor(coinsEarned * (1 + 0.1 * gameState.upgrades.coinMultiplier.currentLevel));
        }
        gameState.coins += coinsEarned;
        gameState.coinsChanged = true;
        showNotification(`Дерево полито! +${coinsEarned} монет`);
    }
    
    // 10% шанс получить очко навыка
    if (Math.random() < CONSTANTS.SKILL_POINT_CHANCE) {
        const categories = Object.keys(gameState.skills);
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        gameState.skills[randomCategory].points += 1;
        showSkillPointAnimation(randomCategory);
        renderSkills();
    }
    
    checkLevelUp();
    updateUI();
    saveGame();
}

// Анимация получения очков навыков
function showSkillPointAnimation(category) {
    const animation = document.createElement('div');
    animation.className = 'skill-point-animation';
    animation.textContent = `+1 ${category}`;
    document.body.appendChild(animation);
    
    setTimeout(() => {
        animation.classList.add('animate');
        setTimeout(() => animation.remove(), 1000);
    }, 10);
}

function plantTree() {
    // Проверяем, есть ли свободные слоты
    const hasEmptySlot = Object.values(gameState.gardenSlots).some(
        slot => slot.unlocked && !slot.tree
    );
    
    if (!hasEmptySlot) {
        showNotification("Все слоты заняты! Разблокируйте новые слоты.");
        return;
    }
    
    // Находим первый свободный слот и сажаем дерево
    for (const [slotNumber, slotData] of Object.entries(gameState.gardenSlots)) {
        if (slotData.unlocked && !slotData.tree) {
            plantTreeInSlot(slotNumber);
            return;
        }
    }
}

function plantTreeInSlot(slotNumber) {
    let energyCost = 2;
    if (gameState.upgrades.plantEfficiency.currentLevel > 0) {
        energyCost = Math.max(0.5, energyCost - (0.5 * gameState.upgrades.plantEfficiency.currentLevel));
    }
    
    if (gameState.energy < energyCost) {
        showNotification(`Нужно ${energyCost} энергии!`);
        return;
    }
    
    gameState.energy -= energyCost;
    gameState.energyChanged = true;
    gameState.planted++;
    
    // Создаем новое дерево
    gameState.gardenSlots[slotNumber].tree = {
        type: '🌱',
        plantedAt: Date.now()
    };
    gameState.gardenSlots[slotNumber].lastWatered = Date.now();
    gameState.gardenSlots[slotNumber].growthStage = 0;
    gameState.gardenSlots[slotNumber].xp = 0;
    
    // Делаем это дерево активным
    gameState.activeTreeSlot = slotNumber;
    
    let coinsEarned = CONSTANTS.BASE_COIN_REWARD;
    if (gameState.upgrades.plantReward.currentLevel > 0) {
        coinsEarned += gameState.upgrades.plantReward.currentLevel;
    }
    
    if (gameState.upgrades.coinMultiplier.currentLevel > 0) {
        coinsEarned = Math.floor(coinsEarned * (1 + 0.1 * gameState.upgrades.coinMultiplier.currentLevel));
    }
    
    gameState.coins += coinsEarned;
    gameState.coinsChanged = true;
    
    if (gameState.planted >= gameState.target) {
        gameState.target++;
        gameState.planted = 0;
        gameState.xp += 5;
        showNotification("Цель достигнута! +5XP");
    }
    
    // Проверка достижений
    if (gameState.planted === 1) {
        unlockAchievement('first-tree');
    }
    if (gameState.coins >= 100 && !gameState.profile.achievements.includes('trader')) {
        unlockAchievement('trader');
    }
    
    updateGardenSlotsUI();
    updateUI();
    saveGame();
    showNotification(`Дерево посажено в слот ${slotNumber}! +${coinsEarned} монет`);
}

// Функция для разблокировки слота в саду
function unlockGardenSlot(slotNumber, cost) {
    if (gameState.coins >= cost) {
        gameState.coins -= cost;
        gameState.coinsChanged = true;
        gameState.gardenSlots[slotNumber].unlocked = true;
        
        // Проверяем, все ли слоты разблокированы для достижения
        const allSlotsUnlocked = Object.values(gameState.gardenSlots).every(slot => slot.unlocked);
        if (allSlotsUnlocked && !gameState.profile.achievements.includes('gardener')) {
            unlockAchievement('gardener');
        }
        
        updateGardenSlotsUI();
        updateUI();
        saveGame();
        showNotification(`Слот ${slotNumber} разблокирован за ${cost} монет!`);
    } else {
        showNotification(`Недостаточно монет! Нужно ${cost} монет.`);
    }
}

// Обновление отображения слотов в саду
function updateGardenSlotsUI() {
    if (!elements.gardenSlots) return;
    
    elements.gardenSlots.innerHTML = '';
    
    for (const [slotNumber, slotData] of Object.entries(gameState.gardenSlots)) {
        const slotElement = document.createElement('div');
        slotElement.className = 'garden-slot';
        slotElement.dataset.slot = slotNumber;
        
        if (slotNumber === gameState.activeTreeSlot) {
            slotElement.classList.add('active-slot');
        }
        
        if (slotData.unlocked) {
            if (slotData.tree) {
                // Рассчитываем оставшееся время до гибели дерева
                const timeLeft = CONSTANTS.TREE_DEATH_TIME - (Date.now() - slotData.lastWatered);
                const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
                
                slotElement.innerHTML = `
                    <div class="tree-display">${CONSTANTS.TREE_GROWTH_STAGES[slotData.growthStage]}</div>
                    <div class="tree-stats">
                        <div class="tree-level">Уровень: ${slotData.growthStage + 1}</div>
                        <div class="tree-xp">XP: ${slotData.xp}</div>
                        <div class="tree-timer ${daysLeft < 3 ? 'danger' : ''}">
                            ${daysLeft} дней
                            ${daysLeft < 3 ? '💀' : ''}
                        </div>
                    </div>
                    <button class="btn btn-small select-tree-btn">Выбрать</button>
                `;
                
                slotElement.querySelector('.select-tree-btn').addEventListener('click', () => {
                    gameState.activeTreeSlot = slotNumber;
                    updateGardenSlotsUI();
                    updateUI();
                    showNotification(`Дерево в слоте ${slotNumber} выбрано для полива`);
                });
            } else {
                slotElement.innerHTML = `
                    <div class="empty-slot">+</div>
                    <button class="btn btn-small plant-slot-btn">Посадить (0 монет)</button>
                `;
                slotElement.querySelector('.plant-slot-btn').addEventListener('click', () => {
                    plantTreeInSlot(slotNumber);
                });
            }
        } else {
            slotElement.classList.add('locked');
            slotElement.innerHTML = `
                <div class="empty-slot">🔒</div>
                <button class="btn btn-small unlock-slot-btn">Разблокировать (${CONSTANTS.GARDEN_SLOT_COST} монет)</button>
            `;
            slotElement.querySelector('.unlock-slot-btn').addEventListener('click', () => {
                unlockGardenSlot(slotNumber, CONSTANTS.GARDEN_SLOT_COST);
            });
        }
        
        elements.gardenSlots.appendChild(slotElement);
    }
}

// Проверка здоровья деревьев
function checkTreeHealth() {
    const now = Date.now();
    for (const [slotNumber, slot] of Object.entries(gameState.gardenSlots)) {
        if (slot.tree && slot.lastWatered) {
            const timeSinceWatering = now - slot.lastWatered;
            if (timeSinceWatering > CONSTANTS.TREE_DEATH_TIME) {
                // Дерево погибло
                slot.tree = null;
                slot.growthStage = 0;
                slot.xp = 0;
                showNotification(`Дерево в слоте ${slotNumber} погибло от засухи!`);
                
                if (gameState.activeTreeSlot === slotNumber) {
                    gameState.activeTreeSlot = null;
                }
            }
        }
    }
    updateGardenSlotsUI();
    saveGame();
}

function regenerateEnergy() {
    if (gameState.energy < gameState.maxEnergy) {
        gameState.energy++;
        gameState.energyChanged = true;
        updateUI();
        saveGame();
        showNotification("Энергия восстановлена!");
    }
}

function checkLevelUp() {
    if (gameState.xp >= gameState.nextLevelXP) {
        gameState.level++;
        gameState.xp = gameState.xp - gameState.nextLevelXP;
        gameState.nextLevelXP = Math.floor(gameState.nextLevelXP * 1.5);
        gameState.maxEnergy = 5 + gameState.upgrades.energyCap.currentLevel;
        gameState.energy = gameState.maxEnergy;
        gameState.energyChanged = true;
        
        // Начисляем очки навыков за уровень
        const skillPoints = CONSTANTS.BASE_SKILL_POINTS;
        const categories = Object.keys(gameState.skills);
        categories.forEach(category => {
            gameState.skills[category].points += skillPoints;
        });
        
        // Проверка достижения
        if (gameState.level >= 10 && !gameState.profile.achievements.includes('expert')) {
            unlockAchievement('expert');
        }
        
        updateUI();
        renderSkills();
        saveGame();
        showNotification(`Уровень ${gameState.level}! Энергия восстановлена. Получено ${skillPoints} очков навыков для каждой категории!`);
    }
}

// Форматирование чисел (1K, 1M)
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Обновление интерфейса
function updateUI() {
    if (elements.energyDisplay) elements.energyDisplay.textContent = Math.floor(gameState.energy);
    if (elements.maxEnergyDisplay) elements.maxEnergyDisplay.textContent = gameState.maxEnergy;
    if (elements.coins) elements.coins.textContent = formatNumber(gameState.coins);
    if (elements.target) elements.target.textContent = gameState.target;
    if (elements.currentLevel) elements.currentLevel.textContent = gameState.level;
    
    const progress = (gameState.xp / gameState.nextLevelXP) * 100;
    const roundedProgress = Math.round(progress);
    
    if (elements.progressBar) {
        elements.progressBar.style.width = `${progress}%`;
        elements.progressBar.setAttribute('aria-valuenow', roundedProgress);
    }
    if (elements.progressPercent) elements.progressPercent.textContent = roundedProgress;
    if (elements.nextLevel) elements.nextLevel.textContent = gameState.nextLevelXP - gameState.xp;
    
    const energyPercent = (gameState.energy / gameState.maxEnergy) * 100;
    if (elements.energyBar) elements.energyBar.style.width = `${energyPercent}%`;
    
    // Обновляем отображение активного дерева
    if (gameState.activeTreeSlot && gameState.gardenSlots[gameState.activeTreeSlot].tree) {
        const slot = gameState.gardenSlots[gameState.activeTreeSlot];
        if (elements.tree) elements.tree.textContent = CONSTANTS.TREE_GROWTH_STAGES[slot.growthStage];
    } else {
        if (elements.tree) elements.tree.textContent = '🌱';
    }
    
    if (elements.waterBtn) elements.waterBtn.disabled = gameState.energy <= 0 || !gameState.activeTreeSlot;
    if (elements.plantBtn) elements.plantBtn.disabled = gameState.energy < 2;
    
    // Обновление профиля
    if (elements.username) {
        elements.username.value = gameState.profile.username;
    }
}

// Навыки
function renderSkills() {
    // Обновляем счетчики очков
    document.querySelectorAll('.skill-value').forEach(el => {
        const category = el.id.replace('-points', '');
        if (gameState.skills[category]) {
            el.textContent = gameState.skills[category].points;
        }
    });
    
    // Inventory skills
    const exemFasterMatch = gameState.skills.inventory.upgrades.exemFasterMatch;
    if (elements.upgradeExem) {
        
        elements.upgradeExem.disabled = gameState.skills.inventory.points < exemFasterMatch.cost || 
            exemFasterMatch.currentLevel >= exemFasterMatch.maxLevel;
    }

    const quickHands = gameState.skills.inventory.upgrades.quickHands;
    if (elements.upgradeQuickHands) {
        elements.upgradeExem.textContent = `Улучшить`;
        const canUpgrade = gameState.skills.inventory.points >= quickHands.cost && 
                          quickHands.currentLevel < quickHands.maxLevel &&
                          (!quickHands.required || exemFasterMatch.currentLevel >= quickHands.required.level);
        elements.upgradeQuickHands.disabled = !canUpgrade;
    }

    const organized = gameState.skills.inventory.upgrades.organized;
    if (elements.upgradeOrganized) {
        elements.upgradeExem.textContent = `Улучшить`;
        const canUpgrade = gameState.skills.inventory.points >= organized.cost && 
                          organized.currentLevel < organized.maxLevel &&
                          (!organized.required || quickHands.currentLevel >= organized.required.level);
        elements.upgradeOrganized.disabled = !canUpgrade;
    }
}

function upgradeSkill(category, skillName) {
    const skillCategory = gameState.skills[category];
    const skill = skillCategory.upgrades[skillName];

    // Проверка требований
    if (skill.required) {
        const requiredSkill = skillCategory.upgrades[skill.required.skill];
        if (!requiredSkill || requiredSkill.currentLevel < skill.required.level) {
            showNotification(`Сначала улучшите ${requiredSkill.name} до уровня ${skill.required.level}!`);
            return;
        }
    }

    if (skillCategory.points >= skill.cost && skill.currentLevel < skill.maxLevel) {
        skillCategory.points -= skill.cost;
        skill.currentLevel++;
        renderSkills();
        saveGame();
        showNotification(`Навык "${skill.name}" улучшен до уровня ${skill.currentLevel}!`);
    } else if (skillCategory.points < skill.cost) {
        showNotification("Недостаточно очков для улучшения!");
    }
}

// Магазин
function renderShop() {
    if (!elements.shopItems) return;
    
    elements.shopItems.innerHTML = '';
    
    for (const [key, upgrade] of Object.entries(gameState.upgrades)) {
        const item = document.createElement('div');
        item.className = 'shop-item';
        
        item.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-title">${upgrade.name}</div>
                <div class="shop-item-level">(${upgrade.currentLevel}/${upgrade.maxLevel})</div>
                <div class="shop-item-desc">${upgrade.description}</div>
            </div>
            <button class="shop-item-btn" data-upgrade="${key}" 
                ${gameState.coins < upgrade.price || upgrade.currentLevel >= upgrade.maxLevel ? 'disabled' : ''}>
                Купить (${formatNumber(upgrade.price)})
            </button>
        `;
        
        elements.shopItems.appendChild(item);
    }
    
    document.querySelectorAll('.shop-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            buyUpgrade(this.dataset.upgrade);
        });
    });
}

function buyUpgrade(upgradeKey) {
    const upgrade = gameState.upgrades[upgradeKey];
    
    if (gameState.coins >= upgrade.price && upgrade.currentLevel < upgrade.maxLevel) {
        gameState.coins -= upgrade.price;
        gameState.coinsChanged = true;
        upgrade.currentLevel++;
        
        if (upgradeKey === 'energyCap') {
            gameState.maxEnergy = 5 + upgrade.currentLevel;
            gameState.energy = gameState.maxEnergy;
            gameState.energyChanged = true;
        }
        
        if (upgradeKey === 'energyRegen' && upgrade.currentLevel === 1) {
            setInterval(regenerateEnergy, CONSTANTS.ENERGY_REGEN_TIME);
        }
        
        updateUI();
        renderShop();
        saveGame();
        showNotification(`Улучшение "${upgrade.name}" куплено!`);
    }
}

// Сундуки
function updateChestTimer() {
    const now = Date.now();
    const lastOpened = gameState.chests.daily.lastOpened;
    const timeLeft = lastOpened + gameState.chests.daily.cooldown - now;

    if (elements.dailyTimer) {
        if (timeLeft <= 0) {
            elements.dailyTimer.textContent = "Доступно";
        } else {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            elements.dailyTimer.textContent = `${hours}ч ${minutes}м`;
        }
    }
}

function openChest(type) {
    if (gameState.openingChest) return;
    gameState.openingChest = true;
    
    if (type === 'daily') {
        const now = Date.now();
        if (now - gameState.chests.daily.lastOpened < gameState.chests.daily.cooldown) {
            showNotification("Ежедневный сундук еще не доступен!");
            gameState.openingChest = false;
            return;
        }
        gameState.chests.daily.lastOpened = now;
    } else if (type === 'premium') {
        let price = gameState.chests.premium.price;
        if (gameState.upgrades.premiumDiscount.currentLevel > 0) {
            price = Math.floor(price * (1 - 0.1 * gameState.upgrades.premiumDiscount.currentLevel));
        }
        
        if (gameState.coins < price) {
            showNotification(`Нужно ${price} монет!`);
            gameState.openingChest = false;
            return;
        }
        gameState.coins -= price;
        gameState.coinsChanged = true;
    }

    showRoulette(type).then(rewardType => {
        applyChestReward(type, rewardType);
        updateChestTimer();
        updateUI();
        saveGame();
        gameState.openingChest = false;
    }).catch(() => {
        gameState.openingChest = false;
    });
}

function showRoulette(type) {
    return new Promise((resolve, reject) => {
        const rouletteModal = document.createElement('div');
        rouletteModal.className = 'roulette-modal';
        rouletteModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <div class="roulette-title">🎰 Рулетка сундука</div>
                <div class="roulette-wrapper">
                    <div class="roulette-container">
                        <div class="roulette-items"></div>
                        <div class="roulette-pointer"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(rouletteModal);
        
        setTimeout(() => {
            rouletteModal.classList.add('show');
        }, 10);
        
        const closeBtn = rouletteModal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            rouletteModal.classList.remove('show');
            setTimeout(() => {
                rouletteModal.remove();
                reject();
            }, 300);
        });
        
        const dropRates = gameState.chests[type].dropRates;
        const types = Object.keys(dropRates);
        const rewardType = getChestReward(type);
        const itemsContainer = rouletteModal.querySelector('.roulette-items');
        
        const itemCount = 30;
        const targetIndex = 25;
        
        for (let i = 0; i < itemCount; i++) {
            const isTarget = i === targetIndex;
            const currentType = isTarget ? rewardType : types[Math.floor(Math.random() * types.length)];
            const reward = dropRates[currentType];
            
            const item = document.createElement('div');
            item.className = `roulette-item roulette-${reward.rarity}`;
            item.textContent = reward.emoji;
            if (isTarget) item.dataset.win = 'true';
            itemsContainer.appendChild(item);
        }
        
        const containerWidth = rouletteModal.querySelector('.roulette-container').offsetWidth;
        const itemWidth = 90;
        const centerOffset = containerWidth / 2 - itemWidth / 2;
        const targetPosition = -(targetIndex * itemWidth) + centerOffset;
        
        setTimeout(() => {
            itemsContainer.style.transition = 'transform 4s cubic-bezier(0.15, 0.85, 0.35, 1)';
            itemsContainer.style.transform = `translateX(${targetPosition}px)`;
            
            setTimeout(() => {
                const winningItem = itemsContainer.querySelector('[data-win="true"]');
                if (winningItem) {
                    winningItem.classList.add('winning-item');
                    
                    setTimeout(() => {
                        itemsContainer.style.transition = 'transform 0.2s';
                        setTimeout(() => {
                            itemsContainer.style.transform = `translateX(${targetPosition + 5}px)`;
                            setTimeout(() => {
                                itemsContainer.style.transform = `translateX(${targetPosition - 5}px)`;
                                setTimeout(() => {
                                    itemsContainer.style.transform = `translateX(${targetPosition}px)`;
                                    
                                    setTimeout(() => {
                                        rouletteModal.classList.remove('show');
                                        setTimeout(() => {
                                            rouletteModal.remove();
                                            resolve(rewardType);
                                        }, 300);
                                    }, 1000);
                                }, 50);
                            }, 50);
                        }, 100);
                    }, 4000);
                }
            }, 100);
        }, 100);
    });
}

function getChestReward(chestType) {
    const chest = gameState.chests[chestType];
    
    if (chestType === 'premium') {
        chest.pityCounter = chest.pityCounter || 0;
        chest.pityCounter++;
        if (chest.pityCounter >= 10) {
            chest.pityCounter = 0;
            return 'mythic';
        }
    }
    
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [type, data] of Object.entries(chest.dropRates)) {
        cumulative += data.chance;
        if (random <= cumulative) return type;
    }
    
    return Object.keys(chest.dropRates)[0];
}

function applyChestReward(chestType, rewardType) {
    const reward = gameState.chests[chestType].dropRates[rewardType];
    
    if (reward.bonus.xp) {
        let xpBonus = reward.bonus.xp;
        if (gameState.upgrades.dailyBonus.currentLevel > 0 && chestType === 'daily') {
            xpBonus += gameState.upgrades.dailyBonus.currentLevel;
        }
        gameState.xp += xpBonus;
    }
    if (reward.bonus.coins) {
        let coinsBonus = reward.bonus.coins;
        if (gameState.upgrades.dailyBonus.currentLevel > 0 && chestType === 'daily') {
            coinsBonus += gameState.upgrades.dailyBonus.currentLevel;
        }
        gameState.coins += coinsBonus;
        gameState.coinsChanged = true;
    }
    if (reward.bonus.energy) {
        gameState.energy = Math.min(gameState.energy + reward.bonus.energy, gameState.maxEnergy);
        gameState.energyChanged = true;
    }
    if (reward.bonus.discount) {
        for (const upgrade of Object.values(gameState.upgrades)) {
            upgrade.price = Math.floor(upgrade.price * (1 - reward.bonus.discount));
        }
    }
    
    // Проверка достижения
    if (chestType === 'daily' && !gameState.profile.achievements.includes('collector')) {
        const allDailyOpened = Object.keys(gameState.chests.daily.dropRates).every(type => 
            gameState.chests.daily.lastOpened > 0
        );
        if (allDailyOpened) {
            unlockAchievement('collector');
        }
    }
    
    checkLevelUp();
    showRewardModal(chestType, rewardType);
}

function showRewardModal(chestType, rewardType) {
    const reward = gameState.chests[chestType].dropRates[rewardType];
    
    let bonusText = '';
    if (reward.bonus.xp) bonusText += `+${reward.bonus.xp} XP `;
    if (reward.bonus.coins) bonusText += `+${reward.bonus.coins} монет `;
    if (reward.bonus.energy) bonusText += `+${reward.bonus.energy} энергии `;
    if (reward.bonus.discount) bonusText += `Скидка ${reward.bonus.discount * 100}% в магазине`;
    
    elements.rewardEmoji.textContent = reward.emoji;
    elements.rewardName.textContent = reward.name;
    elements.rewardDescription.textContent = reward.description;
    elements.rewardBonus.textContent = bonusText.trim();
    
    // Добавляем класс редкости
    elements.rewardModal.className = 'reward-modal';
    elements.rewardModal.classList.add(`roulette-${reward.rarity}`);
    
    elements.rewardModal.style.display = 'block';
    elements.rewardModal.classList.add('show');
}

// Достижения
function renderAchievements() {
    if (!elements.allAchievements || !elements.unlockedAchievements) return;
    
    elements.allAchievements.innerHTML = '';
    elements.unlockedAchievements.innerHTML = '';
    
    gameState.achievementsData.forEach(ach => {
        const card = document.createElement('div');
        card.className = `achievement-card ${ach.unlocked ? '' : 'locked'}`;
        card.innerHTML = `
            <div class="icon">${ach.icon}</div>
            <div class="info">
                <div class="title">${ach.title}</div>
                <div class="description">${ach.description}</div>
            </div>
        `;
        
        elements.allAchievements.appendChild(card.cloneNode(true));
        if (ach.unlocked) {
            elements.unlockedAchievements.appendChild(card);
        }
    });
}

function unlockAchievement(id) {
    if (!gameState.profile.achievements.includes(id)) {
        gameState.profile.achievements.push(id);
        
        // Обновляем данные достижений
        const achievement = gameState.achievementsData.find(a => a.id === id);
        if (achievement) {
            achievement.unlocked = true;
            
            // Показываем уведомление
            showNotification(`Достижение разблокировано: ${achievement.title}`);
            
            // Обновляем интерфейс
            renderAchievements();
            saveGame();
        }
    }
}

// Уведомления
function showNotification(text) {
    if (!elements.notification) {
        console.log("Notification:", text);
        return;
    }
    
    notificationQueue.push(text);
    if (!isNotificationShowing) {
        processNotificationQueue();
    }
}

function processNotificationQueue() {
    if (notificationQueue.length === 0) {
        isNotificationShowing = false;
        return;
    }
    
    isNotificationShowing = true;
    const text = notificationQueue.shift();
    
    try {
        elements.notification.textContent = text;
        elements.notification.classList.add('show');
        
        setTimeout(() => {
            elements.notification.classList.remove('show');
            setTimeout(() => {
                processNotificationQueue();
            }, 300);
        }, 2000);
    } catch (e) {
        console.error("Ошибка показа уведомления:", e);
        isNotificationShowing = false;
    }
}

// Сохранение игры
function isLocalStorageAvailable() {
    try {
        const testKey = 'test';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

function loadGame() {
    if (!isLocalStorageAvailable()) {
        console.warn('LocalStorage недоступен. Игра запущена с начальными значениями.');
        return;
    }

    try {
        const saveData = localStorage.getItem('tree-game-save');
        if (saveData) {
            const parsed = JSON.parse(saveData);
            
            if (parsed && typeof parsed === 'object') {
                // Основные данные игры
                gameState.level = parsed.level || 1;
                gameState.xp = parsed.xp || 0;
                gameState.energy = parsed.energy || 5;
                gameState.maxEnergy = parsed.maxEnergy || 5;
                gameState.coins = parsed.coins || 0;
                gameState.target = parsed.target || 1;
                gameState.planted = parsed.planted || 0;
                gameState.nextLevelXP = parsed.nextLevelXP || 10;
                gameState.activeTreeSlot = parsed.activeTreeSlot || null;
                
                // Слоты сада
                if (parsed.gardenSlots) {
                    for (const [slotNumber, slotData] of Object.entries(parsed.gardenSlots)) {
                        if (gameState.gardenSlots[slotNumber]) {
                            gameState.gardenSlots[slotNumber].unlocked = slotData.unlocked || false;
                            gameState.gardenSlots[slotNumber].tree = slotData.tree || null;
                            gameState.gardenSlots[slotNumber].lastWatered = slotData.lastWatered || null;
                            gameState.gardenSlots[slotNumber].growthStage = slotData.growthStage || 0;
                            gameState.gardenSlots[slotNumber].xp = slotData.xp || 0;
                        }
                    }
                }
                
                // Профиль
                if (parsed.profile) {
                    gameState.profile.username = parsed.profile.username || CONSTANTS.DEFAULT_USERNAME;
                    gameState.profile.themeMode = parsed.profile.themeMode || 'auto';
                    gameState.profile.achievements = parsed.profile.achievements || [];
                }
                
                // Улучшения
                if (parsed.upgrades) {
                    for (const key in gameState.upgrades) {
                        if (parsed.upgrades[key]) {
                            gameState.upgrades[key].currentLevel = parsed.upgrades[key].currentLevel || 0;
                        }
                    }
                }
                
                // Навыки
                if (parsed.skills) {
                    for (const category in gameState.skills) {
                        if (parsed.skills[category]) {
                            gameState.skills[category].points = parsed.skills[category].points || 0;
                            
                            for (const skill in gameState.skills[category].upgrades) {
                                if (parsed.skills[category].upgrades?.[skill]) {
                                    gameState.skills[category].upgrades[skill].currentLevel = 
                                        parsed.skills[category].upgrades[skill].currentLevel || 0;
                                }
                            }
                        }
                    }
                }
                
                // Сундуки
                if (parsed.chests) {
                    gameState.chests.daily.lastOpened = parsed.chests.daily?.lastOpened || 0;
                    gameState.chests.premium.pityCounter = parsed.chests.premium?.pityCounter || 0;
                }
                
                // Достижения
                if (parsed.achievementsData) {
                    gameState.achievementsData = parsed.achievementsData.map(ach => ({
                        ...ach,
                        unlocked: gameState.profile.achievements.includes(ach.id)
                    }));
                }
            }
        }
    } catch (e) {
        console.error("Ошибка загрузки сохранения:", e);
        const backupName = 'tree-game-save-corrupted-' + Date.now();
        localStorage.setItem(backupName, localStorage.getItem('tree-game-save'));
        localStorage.removeItem('tree-game-save');
    }
}

function saveGame() {
    if (!isLocalStorageAvailable()) {
        console.warn('LocalStorage недоступен. Данные не сохранены.');
        return;
    }

    const now = Date.now();
    if (now - gameState.lastSave > 5000 || gameState.energyChanged || gameState.coinsChanged) {
        try {
            const saveData = {
                level: gameState.level,
                xp: gameState.xp,
                energy: gameState.energy,
                maxEnergy: gameState.maxEnergy,
                coins: gameState.coins,
                target: gameState.target,
                planted: gameState.planted,
                nextLevelXP: gameState.nextLevelXP,
                activeTreeSlot: gameState.activeTreeSlot,
                gardenSlots: gameState.gardenSlots,
                profile: gameState.profile,
                upgrades: Object.fromEntries(
                    Object.entries(gameState.upgrades).map(([key, value]) => [
                        key, 
                        { currentLevel: value.currentLevel }
                    ])
                ),
                skills: Object.fromEntries(
                    Object.entries(gameState.skills).map(([category, data]) => [
                        category,
                        {
                            points: data.points,
                            upgrades: Object.fromEntries(
                                Object.entries(data.upgrades).map(([skill, upgrade]) => [
                                    skill,
                                    { currentLevel: upgrade.currentLevel }
                                ])
                            )
                        }
                    ])
                ),
                chests: {
                    daily: { lastOpened: gameState.chests.daily.lastOpened },
                    premium: { pityCounter: gameState.chests.premium.pityCounter }
                },
                achievementsData: gameState.achievementsData
            };
            
            localStorage.setItem('tree-game-save', JSON.stringify(saveData));
            gameState.lastSave = now;
            gameState.energyChanged = false;
            gameState.coinsChanged = false;
        } catch (e) {
            console.error("Ошибка сохранения:", e);
        }
    }
}

// Админ-панель
function resetGame() {
    if (confirm("Сбросить игру? Весь прогресс будет потерян!")) {
        localStorage.removeItem('tree-game-save');
        location.reload();
    }
}

function applyAdminSettings() {
    const level = parseInt(elements.setLevel.value) || gameState.level;
    const xp = parseInt(elements.setXp.value) || gameState.xp;
    const energy = parseInt(elements.setEnergy.value) || gameState.energy;
    const coins = parseInt(elements.setCoins.value) || gameState.coins;
    
    gameState.level = Math.max(1, level);
    gameState.xp = Math.max(0, xp);
    gameState.energy = Math.max(0, Math.min(energy, gameState.maxEnergy));
    gameState.coins = Math.max(0, coins);
    gameState.energyChanged = true;
    gameState.coinsChanged = true;
    
    gameState.nextLevelXP = Math.floor(10 * Math.pow(1.5, gameState.level - 1));
    updateUI();
    saveGame();
    showNotification("Настройки применены!");
    
    if (elements.setLevel) elements.setLevel.value = '';
    if (elements.setXp) elements.setXp.value = '';
    if (elements.setEnergy) elements.setEnergy.value = '';
    if (elements.setCoins) elements.setCoins.value = '';
}

// Игра 2048
const game2048 = {
    board: Array(4).fill().map(() => Array(4).fill(0)),
    score: 0,
    bestScore: 0,
    isPlaying: false,
    target: 2048,
    reachedTarget: false,
    victoryShown: false,

    init() {
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.reachedTarget = false;
        this.victoryShown = false;
        this.loadBestScore();
        this.addRandomTile();
        this.addRandomTile();
        this.updateUI();
        this.isPlaying = true;
    },

    loadBestScore() {
        const saved = localStorage.getItem('2048-best-score');
        this.bestScore = saved ? parseInt(saved) : 0;
    },

    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('2048-best-score', this.bestScore.toString());
        }
    },

    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.board[i][j] === 0) emptyCells.push({i, j});
            }
        }
        
        if (emptyCells.length > 0) {
            const {i, j} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[i][j] = Math.random() < 0.9 ? 2 : 4;
            
            if (elements.game2048Board && elements.game2048Board.children.length > 0) {
                const tiles = elements.game2048Board.querySelectorAll('.tile');
                if (tiles && tiles[i * 4 + j]) {
                    const newTile = tiles[i * 4 + j];
                    newTile.classList.add('tile-new');
                    setTimeout(() => newTile.classList.remove('tile-new'), 100);
                }
            }
            
            return true;
        }
        return false;
    },

    addSpecificTile(value) {
        const emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.board[i][j] === 0) emptyCells.push({i, j});
            }
        }
        
        if (emptyCells.length > 0) {
            const {i, j} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[i][j] = value;
            
            if (elements.game2048Board && elements.game2048Board.children.length > 0) {
                const tiles = elements.game2048Board.querySelectorAll('.tile');
                if (tiles && tiles[i * 4 + j]) {
                    const newTile = tiles[i * 4 + j];
                    newTile.classList.add('tile-new');
                    setTimeout(() => newTile.classList.remove('tile-new'), 100);
                }
            }
            
            return true;
        }
        return false;
    },

    move(direction) {
        if (!this.isPlaying) return false;
        
        const oldBoard = JSON.parse(JSON.stringify(this.board));
        let scoreIncrease = 0;

        switch(direction) {
            case 'left':
                for (let i = 0; i < 4; i++) {
                    const result = this.moveRow(this.board[i]);
                    this.board[i] = result.row;
                    scoreIncrease += result.score;
                }
                break;
            case 'right':
                for (let i = 0; i < 4; i++) {
                    const result = this.moveRow(this.board[i].reverse());
                    this.board[i] = result.row.reverse();
                    scoreIncrease += result.score;
                }
                break;
            case 'up':
                for (let j = 0; j < 4; j++) {
                    let column = [this.board[0][j], this.board[1][j], this.board[2][j], this.board[3][j]];
                    const result = this.moveRow(column);
                    column = result.row;
                    scoreIncrease += result.score;
                    for (let i = 0; i < 4; i++) this.board[i][j] = column[i];
                }
                break;
            case 'down':
                for (let j = 0; j < 4; j++) {
                    let column = [this.board[0][j], this.board[1][j], this.board[2][j], this.board[3][j]].reverse();
                    const result = this.moveRow(column);
                    column = result.row.reverse();
                    scoreIncrease += result.score;
                    for (let i = 0; i < 4; i++) this.board[i][j] = column[i];
                }
                break;
        }

        if (JSON.stringify(this.board) !== JSON.stringify(oldBoard)) {
            if (scoreIncrease > 0) {
                this.showScoreAnimation(scoreIncrease);
            }
            
            this.score += scoreIncrease;
            this.addRandomTile();
            this.updateUI();
            this.checkGameStatus();
            return true;
        }
        return false;
    },

    moveRow(row) {
        let newRow = row.filter(cell => cell !== 0);
        let score = 0;
        let merged = Array(newRow.length).fill(false);
        
        for (let i = 0; i < newRow.length - 1; i++) {
            if (!merged[i] && newRow[i] === newRow[i + 1]) {
                newRow[i] *= 2;
                score += newRow[i];
                newRow[i + 1] = 0;
                merged[i] = true;
                
                if (newRow[i] === this.target && !this.reachedTarget) {
                    this.reachedTarget = true;
                }
            }
        }
        
        newRow = newRow.filter(cell => cell !== 0);
        while (newRow.length < 4) newRow.push(0);
        
        return { row: newRow, score: score };
    },

    showScoreAnimation(amount) {
        if (!elements.game2048Container || !elements.game2048Score) return;
        
        const scoreElement = document.createElement('div');
        scoreElement.className = 'score-animation';
        scoreElement.textContent = `+${amount}`;
        scoreElement.style.top = '10px';
        scoreElement.style.left = `${elements.game2048Score.offsetLeft + elements.game2048Score.offsetWidth / 2}px`;
        elements.game2048Container.appendChild(scoreElement);
        
        setTimeout(() => {
            scoreElement.style.top = '-20px';
            scoreElement.style.opacity = '0';
            setTimeout(() => scoreElement.remove(), 500);
        }, 100);
    },

    checkGameStatus() {
        if (this.reachedTarget && !this.victoryShown) {
            this.victoryShown = true;
            this.isPlaying = false;
            this.saveBestScore();
            
            let coinsEarned = 5;
            if (gameState.upgrades.coinMultiplier?.currentLevel) {
                coinsEarned = Math.floor(coinsEarned * (1 + 0.1 * gameState.upgrades.coinMultiplier.currentLevel));
            }
            
            gameState.coins += coinsEarned;
            gameState.coinsChanged = true;
            updateUI();
            saveGame();
            
            this.showVictoryScreen();
            return;
        }

        if (this.isGameOver()) {
            this.isPlaying = false;
            this.saveBestScore();
            this.showGameOverScreen();
        }
    },

    showVictoryScreen() {
        if (!elements.game2048Container) return;
        
        const victoryScreen = document.createElement('div');
        victoryScreen.className = 'victory-screen';
        victoryScreen.innerHTML = `
            <div class="victory-content">
                <h2>🎉 Поздравляем!</h2>
                <p>Вы собрали плитку ${this.target}!</p>
                <div class="victory-stats">
                    <div>Ваш счет: ${this.score}</div>
                    <div>Лучший счет: ${this.bestScore}</div>
                    <div>+5 монет за победу!</div>
                </div>
                <div class="victory-buttons">
                    <button id="continue-btn" class="btn btn-primary">Продолжить</button>
                    <button id="new-game-btn" class="btn btn-secondary">Новая игра</button>
                </div>
            </div>
        `;
        
        elements.game2048Container.appendChild(victoryScreen);
        
        document.getElementById('continue-btn')?.addEventListener('click', () => {
            victoryScreen.remove();
            this.isPlaying = true;
            this.victoryShown = false;
        });
        
        document.getElementById('new-game-btn')?.addEventListener('click', () => {
            victoryScreen.remove();
            this.start();
        });
    },

    showGameOverScreen() {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.className = 'game-over-screen';
        gameOverScreen.innerHTML = `
            <div class="game-over-content">
                <h2>Игра окончена</h2>
                <div class="game-stats">
                    <div>Ваш счет: ${this.score}</div>
                    <div>Лучший счет: ${this.bestScore}</div>
                </div>
                <div class="game-buttons">
                    <button id="try-again-btn" class="btn btn-primary">Попробовать снова</button>
                    <button id="main-menu-btn" class="btn btn-secondary">Главное меню</button>
                </div>
            </div>
        `;
        
        elements.game2048Container.appendChild(gameOverScreen);
        
        document.getElementById('try-again-btn')?.addEventListener('click', () => {
            gameOverScreen.remove();
            this.start();
        });
        
        document.getElementById('main-menu-btn')?.addEventListener('click', () => {
            gameOverScreen.remove();
            this.close();
        });
    },
	
    isGameOver() {
        // Проверка пустых клеток
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.board[i][j] === 0) return false;
            }
        }

        // Проверка возможных слияний по горизонтали
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.board[i][j] === this.board[i][j + 1]) return false;
            }
        }

        // Проверка возможных слияний по вертикали
        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 3; i++) {
                if (this.board[i][j] === this.board[i + 1][j]) return false;
            }
        }

        return true;
    },

    updateUI() {
        if (!elements.game2048Board || !elements.game2048Score) return;
        
        elements.game2048Board.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const value = this.board[i][j];
                const tile = document.createElement('div');
                tile.className = `tile tile-${value}`;
                tile.textContent = value !== 0 ? value : '';
                
                if (value >= 4096) {
                    tile.style.fontSize = '0.7rem';
                } else if (value >= 1024) {
                    tile.style.fontSize = '0.8rem';
                } else if (value >= 128) {
                    tile.style.fontSize = '0.9rem';
                } else {
                    tile.style.fontSize = '1.2rem';
                }
                
                elements.game2048Board.appendChild(tile);
            }
        }
        
        elements.game2048Score.textContent = `Счет: ${this.score} (Лучший: ${this.bestScore})`;
    },

    start() {
        this.init();
        if (elements.game2048Container) {
            elements.game2048Container.style.display = 'block';
        }
    },

    close() {
        this.isPlaying = false;
        if (elements.game2048Container) {
            elements.game2048Container.style.display = 'none';
        }
        const victoryScreen = elements.game2048Container?.querySelector('.victory-screen');
        if (victoryScreen) victoryScreen.remove();
    }
};

// Запуск игры
document.addEventListener('DOMContentLoaded', initGame);
