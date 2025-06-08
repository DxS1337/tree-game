// Telegram WebApp initialization
'use strict';

let tg;
if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    tg = Telegram.WebApp;
    tg.expand(); // Раскрываем WebApp на весь экран
    
    // Удалены неподдерживаемые методы
    console.log('Telegram WebApp инициализирован, платформа:', tg.platform);
} else {
    console.warn('Telegram WebApp не обнаружен. Режим совместимости.');
    tg = { 
        WebApp: { 
            platform: 'unknown', 
            expand: () => {},
            showPopup: () => {},
            colorScheme: 'light',
            viewportHeight: window.innerHeight
        } 
    };
}

// Game constants
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
    TREE_DEATH_TIME: 7 * 24 * 60 * 60 * 1000,
    TREE_GROWTH_STAGES: ['🌱', '🌿', '🌳', '🌲'],
    TREE_GROWTH_XP: [0, 5, 10, 20],
    SKILL_POINT_CHANCE: 0.1,
    BASE_SKILL_POINTS: 1,
    IS_TELEGRAM: typeof Telegram !== 'undefined',
    VIEWPORT_HEIGHT: tg?.WebApp?.viewportHeight || window.innerHeight
};

// Game state (unchanged)
const gameState = {
    profile: {
        username: "Игрок",
        achievements: [],
        themeMode: "auto", // Добавьте значение по умолчанию
    },
};

// Initialize achievements
function initAchievements() {
    gameState.achievementsData.forEach(ach => {
        ach.unlocked = gameState.profile.achievements.includes(ach.id);
    });
}

// Notification queue
const notificationQueue = [];
let isNotificationShowing = false;

// DOM elements
const elements = {
    // ... (previous elements definition remains the same)
};

// Loading steps
const LOADING_STEPS = {
    INIT: 10,
    STATE: 30,
    UI: 20,
    LISTENERS: 20,
    FINISH: 20
};

let currentProgress = 0;

// Update loading progress
function updateProgress(step) {
    if (!elements.loadingScreen) return;
    
    currentProgress += step;
    const progressPercent = Math.min(100, Math.floor(currentProgress));
    elements.loadingProgress.textContent = `${progressPercent}%`;
    
    if (progressPercent >= 100) {
        setTimeout(() => {
            elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                elements.loadingScreen.style.display = 'none';
                document.body.classList.add('loaded');
                elements.gameApp.classList.add('loaded');
            }, 500);
        }, 300);
    }
}

// Apply theme function
function applyTheme() {
    try {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeMode = gameState.profile?.themeMode || 'auto'; // Запасное значение
        
        if (themeMode === 'dark' || (themeMode === 'auto' && prefersDark)) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    } catch (error) {
        console.error('Ошибка в applyTheme:', error);
    }
}
// Add share button for Telegram
function addShareButton() {
    if (tg?.platform !== 'unknown' && !document.getElementById('share-btn')) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'share-btn';
        shareBtn.className = 'btn btn-secondary';
        shareBtn.textContent = 'Поделиться';
        shareBtn.style.position = 'fixed';
        shareBtn.style.bottom = '60px';
        shareBtn.style.right = '10px';
        shareBtn.style.zIndex = '1000';
        
        shareBtn.addEventListener('click', () => {
            if (tg?.WebApp?.share) {
                tg.WebApp.share({
                    title: 'Дерево-Игра',
                    text: 'Попробуй эту крутую игру!',
                    url: window.location.href
                });
            } else {
                showNotification('Функция "Поделиться" недоступна');
            }
        });
        
        document.body.appendChild(shareBtn);
    }
}

// Initialize game
function initGame() {
    updateProgress(LOADING_STEPS.INIT);
    
    setTimeout(() => {
        applyTheme();
        updateProgress(LOADING_STEPS.STATE);
        
        setTimeout(() => {
            loadGame();
            updateProgress(LOADING_STEPS.UI);
            
            setTimeout(() => {
                initAchievements();
                updateUI();
                updateChestTimer();
                renderSkills();
                renderShop();
                renderAchievements();
                updateGardenSlotsUI();
                updateProgress(LOADING_STEPS.LISTENERS);
                
                setTimeout(() => {
                    setupEventListeners();
                    updateProgress(LOADING_STEPS.FINISH);
                    
                    // Telegram specific initialization
                    if (CONSTANTS.IS_TELEGRAM) {
                        document.documentElement.style.setProperty('--viewport-height', `${CONSTANTS.VIEWPORT_HEIGHT}px`);
                        document.body.classList.add('telegram-app');
                        
                        // Disable zoom on iOS
                        document.addEventListener('touchmove', function(e) {
                            if (e.scale !== 1) { e.preventDefault(); }
                        }, { passive: false });
                        
                        // Handle viewport changes
                        Telegram.WebApp.onEvent('viewportChanged', () => {
                            const newHeight = Telegram.WebApp.viewportHeight;
                            document.documentElement.style.setProperty('--viewport-height', `${newHeight}px`);
                        });
                        
                        // iOS optimizations
                        if (tg.platform === 'ios') {
                            document.body.style.height = `${tg.viewportHeight}px`;
                            window.addEventListener('resize', () => {
                                document.body.style.height = `${tg.viewportHeight}px`;
                            });
                        }
                    }
                    
                    // Add share button if in Telegram
                    if (tg?.platform !== 'unknown') {
                        addShareButton();
                    }
                    
                    // Start timers
                    setInterval(updateChestTimer, 60000);
                    setInterval(regenerateEnergy, CONSTANTS.ENERGY_REGEN_TIME);
                    setInterval(checkTreeHealth, 24 * 60 * 60 * 1000);
                    
                    if (elements.rewardModal) {
                        elements.rewardModal.style.display = 'none';
                    }
                    checkTreeHealth();
                }, 50);
            }, 50);
        }, 50);
    }, 50);
}

// Setup event listeners
function setupEventListeners() {
    // Basic buttons
    if (elements.waterBtn) elements.waterBtn.addEventListener('click', waterTree);
    if (elements.plantBtn) elements.plantBtn.addEventListener('click', plantTree);
    
    // Navigation
    if (elements.skillsNav) elements.skillsNav.addEventListener('click', () => showContentSection('skills-content'));
    if (elements.shopNav) elements.shopNav.addEventListener('click', () => showContentSection('shop-content'));
    if (elements.homeNav) elements.homeNav.addEventListener('click', () => showContentSection('home-content'));
    if (elements.profileNav) elements.profileNav.addEventListener('click', () => showContentSection('profile-content'));
    
    // Skills
    if (elements.upgradeExem) elements.upgradeExem.addEventListener('click', () => upgradeSkill('inventory', 'exemFasterMatch'));
    if (elements.upgradeQuickHands) elements.upgradeQuickHands.addEventListener('click', () => upgradeSkill('inventory', 'quickHands'));
    if (elements.upgradeOrganized) elements.upgradeOrganized.addEventListener('click', () => upgradeSkill('inventory', 'organized'));
    
    // Admin panel
    if (elements.adminBtn) {
        elements.adminBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (elements.adminPanel) elements.adminPanel.classList.toggle('show');
        });
    }
    
    if (elements.resetBtn) elements.resetBtn.addEventListener('click', resetGame);
    if (elements.applyBtn) elements.applyBtn.addEventListener('click', applyAdminSettings);
    
    if (elements.addBlockBtn) {
        elements.addBlockBtn.addEventListener('click', () => {
            if (game2048.isPlaying) {
                game2048.addSpecificTile(2048);
                game2048.updateUI();
            }
        });
    }
    
    if (elements.addTileBtn) {
        elements.addTileBtn.addEventListener('click', () => {
            const value = parseInt(elements.setTileValue?.value) || 2;
            if (game2048.isPlaying) {
                game2048.addSpecificTile(value);
                game2048.updateUI();
            }
        });
    }
    
    if (elements.setTileValue) {
        elements.setTileValue.addEventListener('input', function() {
            if (elements.tileValueDisplay) elements.tileValueDisplay.textContent = this.value;
        });
    }
    
    // Chests
    if (elements.chestMenuBtn) {
        elements.chestMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (elements.chestMenu) {
                elements.chestMenu.classList.toggle('show');
                updateChestTimer();
            }
        });
    }
    
    document.querySelectorAll('.chest-option').forEach(option => {
        option.addEventListener('click', function() {
            if (gameState.openingChest) return;
            openChest(this.dataset.type);
            if (elements.chestMenu) elements.chestMenu.classList.remove('show');
        });
    });
    
    // Games
    if (elements.game2048Card) elements.game2048Card.addEventListener('click', () => game2048.start());
    if (elements.game2048Restart) elements.game2048Restart.addEventListener('click', () => game2048.start());
    if (elements.game2048Close) elements.game2048Close.addEventListener('click', () => game2048.close());
    
    // Profile
    if (elements.username) {
        elements.username.addEventListener('change', function() {
            gameState.profile.username = this.value || CONSTANTS.DEFAULT_USERNAME;
            saveGame();
        });
    }
    
    // Achievement tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.achievement-list').forEach(list => {
                list.classList.add('hidden');
            });
            
            const tabContent = document.getElementById(`${this.dataset.tab}-achievements`);
            if (tabContent) tabContent.classList.remove('hidden');
        });
    });

    // Click outside modals
    window.addEventListener('click', (event) => {
        if (!event.target.closest('.admin-panel') && !event.target.closest('.admin-btn') && elements.adminPanel) {
            elements.adminPanel.classList.remove('show');
        }
        if (!event.target.closest('.chest-menu') && !event.target.closest('.chest-menu-btn') && elements.chestMenu) {
            elements.chestMenu.classList.remove('show');
        }
        if (!event.target.closest('.reward-modal') && event.target !== elements.rewardModal && elements.rewardModal) {
            elements.rewardModal.style.display = 'none';
        }
    });

    // Keyboard controls for 2048
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

    // Swipe controls for 2048
    if (elements.game2048Board) {
        elements.game2048Board.addEventListener('touchstart', game2048.handleTouchStart.bind(game2048), { passive: true });
        elements.game2048Board.addEventListener('touchend', game2048.handleTouchEnd.bind(game2048), { passive: false });
    }

    // Close reward modal
    if (elements.rewardModal) {
        const closeBtn = elements.rewardModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                elements.rewardModal.style.display = 'none';
            });
        }
        
        const rewardBtn = elements.rewardModal.querySelector('.btn');
        if (rewardBtn) {
            rewardBtn.addEventListener('click', () => {
                elements.rewardModal.style.display = 'none';
            });
        }
    }
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
                
                const selectBtn = slotElement.querySelector('.select-tree-btn');
                if (selectBtn) {
                    selectBtn.addEventListener('click', () => {
                        gameState.activeTreeSlot = slotNumber;
                        updateGardenSlotsUI();
                        updateUI();
                        showNotification(`Дерево в слоте ${slotNumber} выбрано для полива`);
                    });
                }
            } else {
                slotElement.innerHTML = `
                    <div class="empty-slot">+</div>
                    <button class="btn btn-small plant-slot-btn">Посадить (0 монет)</button>
                `;
                const plantBtn = slotElement.querySelector('.plant-slot-btn');
                if (plantBtn) {
                    plantBtn.addEventListener('click', () => {
                        plantTreeInSlot(slotNumber);
                    });
                }
            }
        } else {
            slotElement.classList.add('locked');
            slotElement.innerHTML = `
                <div class="empty-slot">🔒</div>
                <button class="btn btn-small unlock-slot-btn">Разблокировать (${CONSTANTS.GARDEN_SLOT_COST} монет)</button>
            `;
            const unlockBtn = slotElement.querySelector('.unlock-slot-btn');
            if (unlockBtn) {
                unlockBtn.addEventListener('click', () => {
                    unlockGardenSlot(slotNumber, CONSTANTS.GARDEN_SLOT_COST);
                });
            }
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
        
        rouletteModal.style.display = 'flex';
        setTimeout(() => {
            rouletteModal.classList.add('show');
        }, 10);
        
        const closeBtn = rouletteModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                rouletteModal.classList.remove('show');
                setTimeout(() => {
                    rouletteModal.remove();
                    reject();
                }, 300);
            });
        }
        
        const dropRates = gameState.chests[type].dropRates;
        const types = Object.keys(dropRates);
        const rewardType = getChestReward(type);
        const itemsContainer = rouletteModal.querySelector('.roulette-items');
        
        const itemCount = 30;
        const targetIndex = 25;
        
        // Создаем элементы рулетки
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
        
        // Рассчитываем позицию для остановки
        const containerWidth = rouletteModal.querySelector('.roulette-container').offsetWidth;
        const itemWidth = 80;
        const centerOffset = containerWidth / 2 - itemWidth / 2;
        const targetPosition = -(targetIndex * itemWidth) + centerOffset;
        
        // Запускаем анимацию
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
    if (!elements.rewardModal || !elements.rewardEmoji || !elements.rewardName || 
        !elements.rewardDescription || !elements.rewardBonus) return;
    
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
    if (!isLocalStorageAvailable()) return;

    const saveData = localStorage.getItem('tree-game-save');
    if (saveData) {
        const parsed = JSON.parse(saveData);
        
        // Восстановите profile, если он есть в сохранении
        if (parsed.profile) {
            gameState.profile = {
                ...gameState.profile, // Значения по умолчанию
                ...parsed.profile,    // Загруженные данные
            };
        }
    }
}

    try {  // <-- Этот блок начинается после лишней закрывающей скобки
        const saveData = localStorage.getItem('tree-game-save');
        // ...
    } catch (e) {
        console.error("Ошибка загрузки сохранения:", e);
    }
}            
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

    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
    },
    
    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;
        this.handleSwipe();
    },
    
    handleSwipe() {
        const dx = this.touchEndX - this.touchStartX;
        const dy = this.touchEndY - this.touchStartY;
        const minSwipeDistance = 50;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) < minSwipeDistance) return;
            if (dx > 0) this.move('right');
            else this.move('left');
        } else {
            if (Math.abs(dy) < minSwipeDistance) return;
            if (dy > 0) this.move('down');
            else this.move('up');
        }
    },

    start() {
        this.init();
        if (elements.game2048Container) {
            elements.game2048Container.style.display = 'block';
            elements.game2048Container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            elements.game2048Container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        }
    },

    close() {
        this.isPlaying = false;
        if (elements.game2048Container) {
            elements.game2048Container.style.display = 'none';
            elements.game2048Container.removeEventListener('touchstart', this.handleTouchStart);
            elements.game2048Container.removeEventListener('touchend', this.handleTouchEnd);
        }
        const victoryScreen = elements.game2048Container?.querySelector('.victory-screen');
        if (victoryScreen) victoryScreen.remove();
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
        
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                victoryScreen.remove();
                this.isPlaying = true;
                this.victoryShown = false;
            });
        }
        
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                victoryScreen.remove();
                this.start();
            });
        }
    },

    showGameOverScreen() {
        if (!elements.game2048Container) return;
        
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
        
        const tryAgainBtn = document.getElementById('try-again-btn');
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', () => {
                gameOverScreen.remove();
                this.start();
            });
        }
        
        const mainMenuBtn = document.getElementById('main-menu-btn');
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => {
                gameOverScreen.remove();
                this.close();
            });
        }
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
document.addEventListener('DOMContentLoaded', () => {
    if (elements.loadingScreen) {
        elements.loadingScreen.style.display = 'flex';
    }
    initGame();
});
