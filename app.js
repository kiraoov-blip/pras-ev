/* 제주 전기차 시간대 지정 할인요금 매출영향 시뮬레이터
   - 전력량요금만 산정
   - 2025년 사용량 × 2026년 전기자동차 충전전력요금
   - 제주 시간대: 경부하 22~08, 중간부하 08~16, 최대부하 16~22
*/

const RATE_TABLES = {
  self_low: {
    label: "자가소비용 · 저압",
    group: "자가소비용",
    voltage: "저압",
    season: {
      summer: { off: 84.3, mid: 172.0, peak: 259.2 },
      springfall: { off: 85.4, mid: 97.2, peak: 102.1 },
      winter: { off: 107.4, mid: 154.9, peak: 217.5 }
    }
  },
  self_high: {
    label: "자가소비용 · 고압",
    group: "자가소비용",
    voltage: "고압",
    season: {
      summer: { off: 79.2, mid: 137.4, peak: 190.4 },
      springfall: { off: 80.2, mid: 91.0, peak: 94.9 },
      winter: { off: 96.6, mid: 127.7, peak: 165.5 }
    }
  },
  service_low_1: {
    label: "충전서비스 제공사업자용 · 저압 선택Ⅰ",
    group: "충전서비스 제공사업자용",
    voltage: "저압",
    season: {
      summer: { off: 95.9, mid: 162.2, peak: 203.5 },
      springfall: { off: 85.4, mid: 97.2, peak: 102.1 },
      winter: { off: 110.6, mid: 143.1, peak: 172.0 }
    }
  },
  service_low_2: {
    label: "충전서비스 제공사업자용 · 저압 선택Ⅱ",
    group: "충전서비스 제공사업자용",
    voltage: "저압",
    season: {
      summer: { off: 83.1, mid: 140.0, peak: 270.8 },
      springfall: { off: 85.4, mid: 97.2, peak: 102.1 },
      winter: { off: 105.8, mid: 126.7, peak: 227.0 }
    }
  },
  service_low_3: {
    label: "충전서비스 제공사업자용 · 저압 선택Ⅲ",
    group: "충전서비스 제공사업자용",
    voltage: "저압",
    season: {
      summer: { off: 90.1, mid: 138.6, peak: 236.0 },
      springfall: { off: 85.4, mid: 97.2, peak: 102.1 },
      winter: { off: 115.5, mid: 125.4, peak: 198.4 }
    }
  },
  service_low_4: {
    label: "충전서비스 제공사업자용 · 저압 선택Ⅳ(전체시간)",
    group: "충전서비스 제공사업자용",
    voltage: "저압",
    season: {
      summer: { off: 172.0, mid: 172.0, peak: 172.0 },
      springfall: { off: 97.2, mid: 97.2, peak: 97.2 },
      winter: { off: 154.9, mid: 154.9, peak: 154.9 }
    }
  },
  service_high_1: {
    label: "충전서비스 제공사업자용 · 고압 선택Ⅰ",
    group: "충전서비스 제공사업자용",
    voltage: "고압",
    season: {
      summer: { off: 89.8, mid: 129.9, peak: 151.2 },
      springfall: { off: 80.2, mid: 91.0, peak: 94.9 },
      winter: { off: 99.4, mid: 118.4, peak: 132.4 }
    }
  },
  service_high_2: {
    label: "충전서비스 제공사업자용 · 고압 선택Ⅱ",
    group: "충전서비스 제공사업자용",
    voltage: "고압",
    season: {
      summer: { off: 78.2, mid: 113.0, peak: 198.6 },
      springfall: { off: 80.2, mid: 91.0, peak: 94.9 },
      winter: { off: 95.2, mid: 105.5, peak: 172.4 }
    }
  },
  service_high_3: {
    label: "충전서비스 제공사업자용 · 고압 선택Ⅲ",
    group: "충전서비스 제공사업자용",
    voltage: "고압",
    season: {
      summer: { off: 84.5, mid: 111.9, peak: 174.0 },
      springfall: { off: 80.2, mid: 91.0, peak: 94.9 },
      winter: { off: 103.6, mid: 104.5, peak: 151.6 }
    }
  },
  service_high_4: {
    label: "충전서비스 제공사업자용 · 고압 선택Ⅳ(전체시간)",
    group: "충전서비스 제공사업자용",
    voltage: "고압",
    season: {
      summer: { off: 137.4, mid: 137.4, peak: 137.4 },
      springfall: { off: 91.0, mid: 91.0, peak: 91.0 },
      winter: { off: 127.7, mid: 127.7, peak: 127.7 }
    }
  }
};

const PERIOD_LABEL = { off: "경부하", mid: "중간부하", peak: "최대부하" };
const TYPE_LABEL = { all: "전체", slow: "완속", fast: "급속" };

const $ = (id) => document.getElementById(id);
let hourlyChart = null;
let monthlyChart = null;
let lastResult = null;

function init() {
  if (!window.EV_USAGE_DATA || !Array.isArray(window.EV_USAGE_DATA.records)) {
    document.body.innerHTML = "<main class='card' style='margin:20px'>사용량 데이터가 로드되지 않았습니다. data/ev_usage_2025.js 파일을 확인하십시오.</main>";
    return;
  }
  populateSelects();
  bindEvents();
  updateVisibility();
  update();
}

function populateSelects() {
  const tariffOptions = Object.entries(RATE_TABLES)
    .map(([key, item]) => `<option value="${key}">${item.label}</option>`)
    .join("");
  $("slowTariff").innerHTML = tariffOptions;
  $("fastTariff").innerHTML = tariffOptions;
  $("slowTariff").value = "self_low";
  $("fastTariff").value = "service_high_1";

  let hourOptions = "";
  for (let h = 0; h <= 24; h += 1) {
    const txt = String(h).padStart(2, "0") + ":00";
    hourOptions += `<option value="${h}">${txt}</option>`;
  }
  $("discountStart").innerHTML = hourOptions;
  $("discountEnd").innerHTML = hourOptions;
  $("discountStart").value = "10";
  $("discountEnd").value = "16";
}

function bindEvents() {
  document.querySelectorAll("input,select").forEach((el) => {
    el.addEventListener("input", () => {
      syncOutputs();
      updateVisibility();
      update();
    });
    el.addEventListener("change", () => {
      syncOutputs();
      updateVisibility();
      update();
    });
  });
  $("neutralizeBtn").addEventListener("click", setRevenueNeutralAdjustment);
  $("downloadCsv").addEventListener("click", downloadHourlyCsv);
  syncOutputs();
}

function syncOutputs() {
  $("discountPctOut").textContent = `${$("discountPct").value}%`;
  $("nonDiscountAdjOut").textContent = `${$("nonDiscountAdj").value}%`;
  $("participationOut").textContent = `${$("participation").value}%`;
  $("slowShiftPctOut").textContent = `${$("slowShiftPct").value}%`;
  $("fastShiftPctOut").textContent = `${$("fastShiftPct").value}%`;
}

function updateVisibility() {
  const mode = $("pricingMode").value;
  $("discountPctWrap").classList.toggle("is-hidden", mode !== "pct");
  $("fixedPriceWrap").classList.toggle("is-hidden", mode !== "fixed");
}

function getControls(override = {}) {
  const selectedPeriods = [...document.querySelectorAll(".sourcePeriod:checked")].map((el) => el.value);
  return {
    filterType: $("filterType").value,
    slowTariff: $("slowTariff").value,
    fastTariff: $("fastTariff").value,
    applyWeekendDiscount: $("applyWeekendDiscount").checked,
    allowStacking: $("allowStacking").checked,
    discountStart: Number($("discountStart").value),
    discountEnd: Number($("discountEnd").value),
    pricingMode: $("pricingMode").value,
    discountPct: Number($("discountPct").value),
    fixedPrice: Number($("fixedPrice").value),
    nonDiscountAdj: Number($("nonDiscountAdj").value),
    participation: Number($("participation").value) / 100,
    slowShiftPct: Number($("slowShiftPct").value) / 100,
    fastShiftPct: Number($("fastShiftPct").value) / 100,
    sourcePeriods: selectedPeriods,
    distributionMode: $("distributionMode").value,
    ...override
  };
}

function isSaturday(dayType) {
  return String(dayType).includes("토");
}

function isSundayOrHoliday(dayType) {
  const t = String(dayType).trim();
  return t === "일·공휴일" || t === "일요일" || t === "공휴일" || t.includes("공휴일");
}

function baseJejuPeriod(hour) {
  if (hour >= 22 || hour < 8) return "off";
  if (hour >= 8 && hour < 16) return "mid";
  return "peak";
}

function billingPeriod(record, hour) {
  if (isSundayOrHoliday(record.day_type)) return "off";
  const period = baseJejuPeriod(hour);
  if (isSaturday(record.day_type) && period === "peak") return "mid";
  return period;
}

function inRange(hour, start, end) {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function weekendDiscountEligible(record, hour) {
  const weekend = isSaturday(record.day_type) || isSundayOrHoliday(record.day_type);
  return record.season === "springfall" && weekend && hour >= 11 && hour < 14;
}

function getTariffKey(record, controls) {
  return record.charge_type === "slow" ? controls.slowTariff : controls.fastTariff;
}

function baseRate(record, hour, tariffKey) {
  const period = billingPeriod(record, hour);
  return RATE_TABLES[tariffKey].season[record.season][period];
}

function currentRate(record, hour, tariffKey, controls) {
  const b = baseRate(record, hour, tariffKey);
  if (controls.applyWeekendDiscount && weekendDiscountEligible(record, hour)) return b * 0.5;
  return b;
}

function newRate(record, hour, tariffKey, controls) {
  const b = baseRate(record, hour, tariffKey);
  const existingWeekend = controls.applyWeekendDiscount && weekendDiscountEligible(record, hour);
  const existingRate = existingWeekend ? b * 0.5 : b;
  const isDiscountHour = inRange(hour, controls.discountStart, controls.discountEnd);

  if (!isDiscountHour) {
    return existingRate * (1 + controls.nonDiscountAdj / 100);
  }

  let proposedRate;
  if (controls.pricingMode === "fixed") {
    proposedRate = Math.max(0, controls.fixedPrice);
    if (existingWeekend && controls.allowStacking) return proposedRate * 0.5;
    if (existingWeekend && !controls.allowStacking) return Math.min(existingRate, proposedRate);
    return proposedRate;
  }

  proposedRate = b * Math.max(0, 1 - controls.discountPct / 100);
  if (existingWeekend && controls.allowStacking) return b * 0.5 * Math.max(0, 1 - controls.discountPct / 100);
  if (existingWeekend && !controls.allowStacking) return Math.min(existingRate, proposedRate);
  return proposedRate;
}

function blankPeriodStats() {
  return {
    off: { currentKwh: 0, scenarioKwh: 0, currentRevenue: 0, scenarioRevenue: 0 },
    mid: { currentKwh: 0, scenarioKwh: 0, currentRevenue: 0, scenarioRevenue: 0 },
    peak: { currentKwh: 0, scenarioKwh: 0, currentRevenue: 0, scenarioRevenue: 0 }
  };
}

function makeEmptyArray(length, value = 0) {
  return Array.from({ length }, () => value);
}

function computeScenario(controls) {
  const records = window.EV_USAGE_DATA.records.filter((rec) => controls.filterType === "all" || rec.charge_type === controls.filterType);
  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, currentRevenue: 0, scenarioRevenue: 0, currentKwh: 0, scenarioKwh: 0 }));
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, currentKwh: 0, scenarioKwh: 0, currentRevenue: 0, scenarioRevenue: 0 }));
  const period = blankPeriodStats();
  const typeTotals = { slow: { kwh: 0, scenarioKwh: 0, shifted: 0 }, fast: { kwh: 0, scenarioKwh: 0, shifted: 0 } };

  let currentRevenue = 0;
  let noShiftRevenue = 0;
  let scenarioRevenue = 0;
  let currentKwh = 0;
  let scenarioKwh = 0;
  let discountKwh = 0;
  let shiftedKwh = 0;
  let targetWindowCurrentKwh = 0;
  let targetWindowScenarioKwh = 0;
  let peakCurrentKwh = 0;
  let peakScenarioKwh = 0;
  let annualMaxCurrentHourKwh = 0;
  let annualMaxScenarioHourKwh = 0;

  for (const rec of records) {
    const tariffKey = getTariffKey(rec, controls);
    const partShare = controls.participation;
    const shiftPct = rec.charge_type === "slow" ? controls.slowShiftPct : controls.fastShiftPct;
    const participant = rec.hours.map((kwh) => kwh * partShare);
    const nonParticipant = rec.hours.map((kwh) => kwh * (1 - partShare));
    const participantAfter = participant.slice();
    const shiftedOut = makeEmptyArray(24);
    const destHours = [];

    for (let h = 0; h < 24; h += 1) {
      if (inRange(h, controls.discountStart, controls.discountEnd)) destHours.push(h);
    }

    let movedTotal = 0;
    if (destHours.length > 0 && shiftPct > 0) {
      for (let h = 0; h < 24; h += 1) {
        const periodKey = billingPeriod(rec, h);
        const isDestination = inRange(h, controls.discountStart, controls.discountEnd);
        if (!isDestination && controls.sourcePeriods.includes(periodKey)) {
          const moved = participant[h] * shiftPct;
          shiftedOut[h] = moved;
          participantAfter[h] -= moved;
          movedTotal += moved;
        }
      }
      if (movedTotal > 0) {
        let weights = destHours.map(() => 1);
        if (controls.distributionMode === "profile") {
          const rawWeights = destHours.map((h) => participant[h]);
          const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
          if (sumWeights > 0) weights = rawWeights;
        }
        const weightSum = weights.reduce((a, b) => a + b, 0);
        destHours.forEach((h, i) => {
          participantAfter[h] += movedTotal * (weights[i] / weightSum);
        });
      }
    }

    const totalAfter = makeEmptyArray(24);
    for (let h = 0; h < 24; h += 1) {
      totalAfter[h] = nonParticipant[h] + participantAfter[h];
    }

    const currentDayTotal = rec.hours.reduce((a, b) => a + b, 0);
    const scenarioDayTotal = totalAfter.reduce((a, b) => a + b, 0);
    annualMaxCurrentHourKwh = Math.max(annualMaxCurrentHourKwh, ...rec.hours);
    annualMaxScenarioHourKwh = Math.max(annualMaxScenarioHourKwh, ...totalAfter);
    typeTotals[rec.charge_type].kwh += currentDayTotal;
    typeTotals[rec.charge_type].scenarioKwh += scenarioDayTotal;
    typeTotals[rec.charge_type].shifted += movedTotal;
    currentKwh += currentDayTotal;
    scenarioKwh += scenarioDayTotal;
    shiftedKwh += movedTotal;

    for (let h = 0; h < 24; h += 1) {
      const kwh = rec.hours[h];
      const cr = currentRate(rec, h, tariffKey, controls);
      const nr = newRate(rec, h, tariffKey, controls);
      const nonKwh = nonParticipant[h];
      const partKwh = participant[h];
      const partAfterKwh = participantAfter[h];
      const afterKwh = totalAfter[h];
      const curRev = kwh * cr;
      const noShiftRev = nonKwh * cr + partKwh * nr;
      const scenRev = nonKwh * cr + partAfterKwh * nr;
      const p = billingPeriod(rec, h);
      const m = rec.month - 1;

      currentRevenue += curRev;
      noShiftRevenue += noShiftRev;
      scenarioRevenue += scenRev;

      monthly[m].currentRevenue += curRev;
      monthly[m].scenarioRevenue += scenRev;
      monthly[m].currentKwh += kwh;
      monthly[m].scenarioKwh += afterKwh;

      hourly[h].currentKwh += kwh;
      hourly[h].scenarioKwh += afterKwh;
      hourly[h].currentRevenue += curRev;
      hourly[h].scenarioRevenue += scenRev;

      period[p].currentKwh += kwh;
      period[p].scenarioKwh += afterKwh;
      period[p].currentRevenue += curRev;
      period[p].scenarioRevenue += scenRev;

      if (p === "peak") {
        peakCurrentKwh += kwh;
        peakScenarioKwh += afterKwh;
      }
      if (inRange(h, controls.discountStart, controls.discountEnd)) {
        discountKwh += partAfterKwh;
        targetWindowCurrentKwh += kwh;
        targetWindowScenarioKwh += afterKwh;
      }
    }
  }

  const recordCount = records.length;
  const dayCount = controls.filterType === "all" ? Math.max(1, recordCount / 2) : Math.max(1, recordCount);
  hourly.forEach((row) => {
    row.avgCurrentKwh = row.currentKwh / dayCount;
    row.avgScenarioKwh = row.scenarioKwh / dayCount;
  });

  return {
    controls,
    recordCount,
    dayCount,
    currentRevenue,
    noShiftRevenue,
    scenarioRevenue,
    revenueDelta: scenarioRevenue - currentRevenue,
    priceEffect: noShiftRevenue - currentRevenue,
    shiftEffect: scenarioRevenue - noShiftRevenue,
    currentKwh,
    scenarioKwh,
    discountKwh,
    shiftedKwh,
    targetWindowCurrentKwh,
    targetWindowScenarioKwh,
    targetWindowDelta: targetWindowScenarioKwh - targetWindowCurrentKwh,
    peakCurrentKwh,
    peakScenarioKwh,
    peakDelta: peakScenarioKwh - peakCurrentKwh,
    annualMaxCurrentHourKwh,
    annualMaxScenarioHourKwh,
    monthly,
    hourly,
    period,
    typeTotals
  };
}

function update() {
  const controls = getControls();
  lastResult = computeScenario(controls);
  renderKpis(lastResult);
  renderCharts(lastResult);
  renderTables(lastResult);
}

function renderKpis(result) {
  const deltaClass = result.revenueDelta >= 0 ? "positive" : "negative";
  const revenuePct = result.currentRevenue ? result.revenueDelta / result.currentRevenue * 100 : 0;
  const peakPct = result.peakCurrentKwh ? result.peakDelta / result.peakCurrentKwh * 100 : 0;
  const targetPct = result.targetWindowCurrentKwh ? result.targetWindowDelta / result.targetWindowCurrentKwh * 100 : 0;
  const cards = [
    { label: "현행 전력량요금 매출", value: formatWon(result.currentRevenue), sub: `${formatKwh(result.currentKwh)} · 기본요금 제외` },
    { label: "신규요금 적용 후 매출", value: formatWon(result.scenarioRevenue), sub: `${formatKwh(result.scenarioKwh)} · 참여율 ${Math.round(result.controls.participation * 100)}%` },
    { label: "매출 증감", value: `${result.revenueDelta >= 0 ? "+" : ""}${formatWon(result.revenueDelta)}`, sub: `${formatSignedPct(revenuePct)} · 현행 대비`, cls: `delta ${deltaClass}` },
    { label: "할인 적용 사용량", value: formatKwh(result.discountKwh), sub: `${timeRangeText(result.controls.discountStart, result.controls.discountEnd)} 참여고객 기준` },
    { label: "부하 이전량", value: formatKwh(result.shiftedKwh), sub: `완속 ${Math.round(result.controls.slowShiftPct*100)}% · 급속 ${Math.round(result.controls.fastShiftPct*100)}%` },
    { label: "최대부하 시간대 변화", value: `${result.peakDelta >= 0 ? "+" : ""}${formatKwh(result.peakDelta)}`, sub: `${formatSignedPct(peakPct)} · 경부하화 기준 반영`, cls: `delta ${result.peakDelta <= 0 ? "positive" : "negative"}` },
    { label: "할인시간대 부하 변화", value: `${result.targetWindowDelta >= 0 ? "+" : ""}${formatKwh(result.targetWindowDelta)}`, sub: `${formatSignedPct(targetPct)} · ${timeRangeText(result.controls.discountStart, result.controls.discountEnd)}` },
    { label: "연중 최대 시간사용량 변화", value: `${formatKwh(result.annualMaxScenarioHourKwh - result.annualMaxCurrentHourKwh)}`, sub: `현행 ${formatKwh(result.annualMaxCurrentHourKwh)} → 변경 ${formatKwh(result.annualMaxScenarioHourKwh)}` }
  ];
  $("kpiGrid").innerHTML = cards.map(card => `
    <article class="kpi ${card.cls || ""}">
      <div class="label">${card.label}</div>
      <div class="value">${card.value}</div>
      <div class="sub">${card.sub}</div>
    </article>
  `).join("");
}

function renderCharts(result) {
  if (!window.Chart) return;
  const hourLabels = result.hourly.map(row => `${String(row.hour).padStart(2,"0")}:00`);
  const currentHourly = result.hourly.map(row => round(row.avgCurrentKwh, 1));
  const scenarioHourly = result.hourly.map(row => round(row.avgScenarioKwh, 1));
  const monthLabels = result.monthly.map(row => `${row.month}월`);
  const currentMonthly = result.monthly.map(row => round(row.currentRevenue / 100000000, 3));
  const scenarioMonthly = result.monthly.map(row => round(row.scenarioRevenue / 100000000, 3));

  if (!hourlyChart) {
    hourlyChart = new Chart($("hourlyChart"), {
      type: "line",
      data: { labels: hourLabels, datasets: [
        { label: "현행 평균 kWh", data: currentHourly, borderWidth: 2, tension: .25 },
        { label: "신규 평균 kWh", data: scenarioHourly, borderWidth: 2, tension: .25 }
      ]},
      options: chartOptions("평균 kWh")
    });
  } else {
    hourlyChart.data.labels = hourLabels;
    hourlyChart.data.datasets[0].data = currentHourly;
    hourlyChart.data.datasets[1].data = scenarioHourly;
    hourlyChart.update();
  }

  if (!monthlyChart) {
    monthlyChart = new Chart($("monthlyChart"), {
      type: "bar",
      data: { labels: monthLabels, datasets: [
        { label: "현행 매출(억 원)", data: currentMonthly, borderWidth: 1 },
        { label: "신규 매출(억 원)", data: scenarioMonthly, borderWidth: 1 }
      ]},
      options: chartOptions("억 원")
    });
  } else {
    monthlyChart.data.labels = monthLabels;
    monthlyChart.data.datasets[0].data = currentMonthly;
    monthlyChart.data.datasets[1].data = scenarioMonthly;
    monthlyChart.update();
  }
}

function chartOptions(yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${number(ctx.raw)}` } }
    },
    scales: {
      y: { title: { display: true, text: yTitle }, ticks: { callback: value => number(value) } },
      x: { ticks: { maxRotation: 0, autoSkip: true } }
    }
  };
}

function renderTables(result) {
  renderDecompTable(result);
  renderPeriodTable(result);
  renderHourlyTable(result);
}

function renderDecompTable(result) {
  const rows = [
    ["현행 전력량요금 매출", result.currentRevenue, "기준선"],
    ["단가·할인 효과", result.priceEffect, "부하이전 전, 참여고객에 신규요금 적용"],
    ["부하이전 효과", result.shiftEffect, "이전 후 시간대별 사용량 재배분"],
    ["신규요금 적용 후 매출", result.scenarioRevenue, "단가·할인 및 부하이전 반영"],
    ["총 매출 증감", result.revenueDelta, `${formatSignedPct(result.currentRevenue ? result.revenueDelta/result.currentRevenue*100 : 0)}`]
  ];
  $("decompTable").innerHTML = `
    <thead><tr><th>구분</th><th>금액</th><th>비고</th></tr></thead>
    <tbody>${rows.map((r, idx) => `
      <tr><td>${r[0]}</td><td>${idx === 0 || idx === 3 ? formatWon(r[1]) : formatSignedWon(r[1])}</td><td>${r[2]}</td></tr>
    `).join("")}</tbody>`;
}

function renderPeriodTable(result) {
  const rows = Object.keys(PERIOD_LABEL).map(key => {
    const p = result.period[key];
    return [PERIOD_LABEL[key], p.currentKwh, p.scenarioKwh, p.scenarioKwh - p.currentKwh, p.currentRevenue, p.scenarioRevenue, p.scenarioRevenue - p.currentRevenue];
  });
  $("periodTable").innerHTML = `
    <thead><tr><th>시간대</th><th>현행 사용량</th><th>변경 사용량</th><th>사용량 증감</th><th>현행 매출</th><th>변경 매출</th><th>매출 증감</th></tr></thead>
    <tbody>${rows.map(r => `
      <tr><td>${r[0]}</td><td>${formatKwh(r[1])}</td><td>${formatKwh(r[2])}</td><td>${formatSignedKwh(r[3])}</td><td>${formatWon(r[4])}</td><td>${formatWon(r[5])}</td><td>${formatSignedWon(r[6])}</td></tr>
    `).join("")}</tbody>`;
}

function renderHourlyTable(result) {
  $("hourlyTable").innerHTML = `
    <thead><tr><th>시각</th><th>현행 평균부하</th><th>변경 평균부하</th><th>평균부하 증감</th><th>현행 매출</th><th>변경 매출</th><th>매출 증감</th></tr></thead>
    <tbody>${result.hourly.map(row => `
      <tr><td>${String(row.hour).padStart(2,"0")}:00~${String((row.hour+1)%24).padStart(2,"0")}:00</td><td>${number(row.avgCurrentKwh)} kWh</td><td>${number(row.avgScenarioKwh)} kWh</td><td>${formatSignedKwh(row.avgScenarioKwh - row.avgCurrentKwh)}</td><td>${formatWon(row.currentRevenue)}</td><td>${formatWon(row.scenarioRevenue)}</td><td>${formatSignedWon(row.scenarioRevenue - row.currentRevenue)}</td></tr>
    `).join("")}</tbody>`;
}

function setRevenueNeutralAdjustment() {
  const baseControls = getControls({ nonDiscountAdj: 0 });
  const target = computeScenario(baseControls).currentRevenue;
  const f = (adj) => computeScenario({ ...baseControls, nonDiscountAdj: adj }).scenarioRevenue - target;
  const lo = -30;
  const hi = 100;
  const flo = f(lo);
  const fhi = f(hi);
  if (flo > 0) {
    $("nonDiscountAdj").value = lo;
    syncOutputs();
    update();
    alert("-30% 조정률에서도 매출이 현행보다 높습니다. 하한값으로 설정했습니다.");
    return;
  }
  if (fhi < 0) {
    $("nonDiscountAdj").value = hi;
    syncOutputs();
    update();
    alert("100% 조정률에서도 매출중립에 도달하지 못합니다. 상한값으로 설정했습니다.");
    return;
  }
  let left = lo;
  let right = hi;
  for (let i = 0; i < 50; i += 1) {
    const mid = (left + right) / 2;
    const fm = f(mid);
    if (fm < 0) left = mid;
    else right = mid;
  }
  const adj = Math.round(((left + right) / 2) * 10) / 10;
  $("nonDiscountAdj").value = adj;
  syncOutputs();
  update();
}

function downloadHourlyCsv() {
  if (!lastResult) return;
  const header = ["hour","current_avg_kwh","scenario_avg_kwh","delta_avg_kwh","current_revenue_won","scenario_revenue_won","delta_revenue_won"];
  const rows = lastResult.hourly.map(row => [
    `${String(row.hour).padStart(2,"0")}:00`,
    round(row.avgCurrentKwh, 3),
    round(row.avgScenarioKwh, 3),
    round(row.avgScenarioKwh - row.avgCurrentKwh, 3),
    round(row.currentRevenue, 0),
    round(row.scenarioRevenue, 0),
    round(row.scenarioRevenue - row.currentRevenue, 0)
  ]);
  const csv = [header, ...rows].map(cols => cols.join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jeju_ev_tariff_hourly_result.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatWon(value) {
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${number(value / 100000000, 1)}억 원`;
  if (abs >= 1000000) return `${number(value / 1000000, 1)}백만 원`;
  return `${number(value, 0)}원`;
}

function formatSignedWon(value) {
  return `${value >= 0 ? "+" : ""}${formatWon(value)}`;
}

function formatKwh(value) {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${number(value / 1000000, 2)}GWh`;
  if (abs >= 1000) return `${number(value / 1000, 1)}MWh`;
  return `${number(value, 1)}kWh`;
}

function formatSignedKwh(value) {
  return `${value >= 0 ? "+" : ""}${formatKwh(value)}`;
}

function formatSignedPct(value) {
  return `${value >= 0 ? "+" : ""}${number(value, 2)}%`;
}

function number(value, digits = 0) {
  return Number(value).toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function timeRangeText(start, end) {
  return `${String(start).padStart(2,"0")}:00–${String(end).padStart(2,"0")}:00`;
}

document.addEventListener("DOMContentLoaded", init);
