import { preloadImages } from './utils.js';

const grids = document.querySelectorAll('.grid');

const RESET_SCROLL_Y = 6000;
const RESET_BUFFER = 1800;

const AUTO_SCROLL_SPEED = 70;
const WALL_SCROLL_SPEED = 0.72;

// 响应式缩放
const BASE_SCREEN_WIDTH = 1728;
const MIN_GRID_SCALE = 0.55;
const MAX_GRID_SCALE = 1;

// 滚轮惯性
const WHEEL_POWER = 0.18;
const WHEEL_FRICTION = 0.96;
const WHEEL_MIN_SPEED = 0.5;
const WHEEL_MAX_SPEED = 60;
const WHEEL_PAUSE_TIME = 0;

// 图片透明度
const EDGE_OPACITY = 0.9;
const CENTER_OPACITY = 1;

// 固定为3列、9张图片
const GRID_COLUMNS = 3;
const IMAGE_COUNT = 9;

let virtualScroll = 0;
let lastScrollY = 0;
let lastFrameTime = 0;
let autoRemainder = 0;
let isResettingScroll = false;
let isAutoPaused = false;
let wheelPauseTimer = null;
let wheelVelocity = 0;
let gridScale = 1;

const mod = (value, size) => {
  return ((value % size) + size) % size;
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const updateGridScale = () => {
  gridScale = clamp(
    window.innerWidth / BASE_SCREEN_WIDTH,
    MIN_GRID_SCALE,
    MAX_GRID_SCALE,
  );
};

const pauseAutoScrollByWheel = (event) => {
  isAutoPaused = true;
  autoRemainder = 0;

  wheelVelocity += event.deltaY * WHEEL_POWER;

  wheelVelocity = clamp(
    wheelVelocity,
    -WHEEL_MAX_SPEED,
    WHEEL_MAX_SPEED,
  );

  clearTimeout(wheelPauseTimer);

  wheelPauseTimer = setTimeout(() => {
    isAutoPaused = false;
  }, WHEEL_PAUSE_TIME);
};

const jumpToMiddle = () => {
  isResettingScroll = true;

  window.scrollTo(0, RESET_SCROLL_Y);
  lastScrollY = RESET_SCROLL_Y;

  requestAnimationFrame(() => {
    isResettingScroll = false;
  });
};

const handlePageScroll = () => {
  const currentY =
    window.scrollY || window.pageYOffset;

  if (!isResettingScroll) {
    const delta = currentY - lastScrollY;

    if (Math.abs(delta) < 1200) {
      virtualScroll += delta;
    }
  }

  lastScrollY = currentY;

  const maxY =
    document.documentElement.scrollHeight -
    window.innerHeight;

  if (
    !isResettingScroll &&
    (
      currentY < RESET_BUFFER ||
      currentY > maxY - RESET_BUFFER
    )
  ) {
    jumpToMiddle();
  }
};

const prepareGrid = (grid) => {
  const gridWrap =
    grid.querySelector('.grid-wrap');

  const allItems = Array.from(
    gridWrap.querySelectorAll('.grid__item'),
  );

  // 只使用HTML中的前9张图片
  const originalItems =
    allItems.slice(0, IMAGE_COUNT);

  if (originalItems.length === 0) {
    return null;
  }

  // 删除第10张之后的图片
  allItems
    .slice(IMAGE_COUNT)
    .forEach((item) => {
      item.remove();
    });

  // 复制两组，用于无缝循环
  for (
    let copyIndex = 0;
    copyIndex < 2;
    copyIndex += 1
  ) {
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);

      clone.setAttribute(
        'aria-hidden',
        'true',
      );

      gridWrap.appendChild(clone);
    });
  }

  const items = Array.from(
    gridWrap.querySelectorAll('.grid__item'),
  );

  const innerItems = items.map((item) => {
    return item.querySelector(
      '.grid__item-inner',
    );
  });

  grid.style.setProperty(
    '--grid-width',
    '50vw',
  );

  grid.style.setProperty(
    '--perspective',
    '3000px',
  );

  // 宽600、高900
  grid.style.setProperty(
    '--grid-item-ratio',
    '0.6667',
  );

  grid.style.setProperty(
    '--grid-columns',
    String(GRID_COLUMNS),
  );

  grid.style.setProperty(
    '--grid-gap',
    '1vw',
  );

  gsap.set(gridWrap, {
    transformStyle: 'preserve-3d',
    force3D: true,
    willChange: 'transform',
    overflow: 'visible',
  });

  gsap.set(items, {
    overflow: 'visible',
    clipPath: 'none',
    transformOrigin: '50% 50%',
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'visible',
    force3D: true,
    willChange: 'transform',
  });

  gsap.set(innerItems, {
    backfaceVisibility: 'visible',
    transformStyle: 'preserve-3d',
    force3D: true,
    willChange: 'opacity',
    z: 1,
  });

  return {
    grid,
    gridWrap,
    items,
    innerItems,
    originalCount: originalItems.length,
    blockHeight: 1,
  };
};

const gridStates = Array.from(grids)
  .map(prepareGrid)
  .filter(Boolean);

const refreshGridSizes = () => {
  gridStates.forEach((state) => {
    const firstRepeatedItem =
      state.items[state.originalCount];

    state.blockHeight = Math.max(
      1,
      firstRepeatedItem
        ? firstRepeatedItem.offsetTop
        : state.gridWrap.scrollHeight / 3,
    );
  });
};

const renderGrid = (state) => {
  const TOP_SAFE_OFFSET = 100;

  const y =
    TOP_SAFE_OFFSET -
    state.blockHeight -
    mod(
      virtualScroll * WALL_SCROLL_SPEED,
      state.blockHeight,
    );

  gsap.set(state.gridWrap, {
    y,
    xPercent: -35,
    rotationY: 35,
    scale: gridScale,
    transformOrigin: '0% 50%',
    transformStyle: 'preserve-3d',
    force3D: true,
    willChange: 'transform',
    overflow: 'visible',
  });

  const gridRect =
    state.grid.getBoundingClientRect();

  const baseTop =
    gridRect.top +
    state.gridWrap.offsetTop +
    y;

  const viewportCenter =
    window.innerHeight / 2;

  state.items.forEach((item, index) => {
    const centerY =
      baseTop +
      item.offsetTop +
      item.offsetHeight / 2;

    const distance =
      (centerY - viewportCenter) /
      viewportCenter;

    const limited =
      clamp(distance, -1, 1);

    const TOP_DEPTH = 100;
    const CENTER_DEPTH = 400;
    const BOTTOM_DEPTH = 700;

    const depth = limited < 0
      ? TOP_DEPTH +
        (1 + limited) *
          (CENTER_DEPTH - TOP_DEPTH)
      : CENTER_DEPTH +
        limited *
          (BOTTOM_DEPTH - CENTER_DEPTH);

    const opacity = clamp(
      CENTER_OPACITY -
        Math.abs(limited) *
          (
            CENTER_OPACITY -
            EDGE_OPACITY
          ),
      EDGE_OPACITY,
      CENTER_OPACITY,
    );

    const column =
      index % GRID_COLUMNS;

    const columnPriority =
      GRID_COLUMNS - column;

    const visualPriority =
      Math.round(depth * 100) +
      columnPriority;

    gsap.set(item, {
      rotationX: limited * 25,
      z:
        depth +
        columnPriority * 0.001,
      zIndex: visualPriority,
      opacity: 1,
      filter: 'none',
      transformOrigin: '50% 50%',
      transformStyle: 'preserve-3d',
      backfaceVisibility: 'visible',
      force3D: true,
      willChange: 'transform',
      overflow: 'visible',
    });

    const inner =
      state.innerItems[index];

    if (inner) {
      gsap.set(inner, {
        opacity,
        backfaceVisibility: 'visible',
        transformStyle: 'preserve-3d',
        force3D: true,
        willChange: 'opacity',
        z: 1,
      });
    }
  });
};

const tick = (time) => {
  const deltaTime = lastFrameTime
    ? (time - lastFrameTime) / 1000
    : 0;

  lastFrameTime = time;

  if (
    Math.abs(wheelVelocity) >
    WHEEL_MIN_SPEED
  ) {
    window.scrollBy(
      0,
      wheelVelocity,
    );

    wheelVelocity *= WHEEL_FRICTION;
  } else {
    wheelVelocity = 0;

    if (!isAutoPaused) {
      autoRemainder +=
        AUTO_SCROLL_SPEED * deltaTime;

      const wholePixels =
        Math.trunc(autoRemainder);

      if (wholePixels !== 0) {
        autoRemainder -= wholePixels;

        window.scrollBy(
          0,
          wholePixels,
        );
      }
    }
  }

  gridStates.forEach(renderGrid);

  requestAnimationFrame(tick);
};

window.addEventListener(
  'scroll',
  handlePageScroll,
  { passive: true },
);

window.addEventListener(
  'wheel',
  pauseAutoScrollByWheel,
  { passive: true },
);

window.addEventListener(
  'resize',
  () => {
    updateGridScale();
    refreshGridSizes();
  },
);

preloadImages(
  '.grid__item-inner',
).then(() => {
  updateGridScale();
  refreshGridSizes();
  jumpToMiddle();

  document.body.classList.remove(
    'loading',
  );

  requestAnimationFrame(tick);
});