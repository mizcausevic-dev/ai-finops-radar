"use strict";

const byId = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);

function addCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = String(value);
  row.appendChild(cell);
  return cell;
}

async function render() {
  const response = await fetch('/api/dashboard/summary', { cache: 'no-store' });
  if (!response.ok) throw new Error('Fixture API unavailable');
  const data = await response.json();
  if (data.dataMode !== 'synthetic-demo') throw new Error('Unexpected data source');

  byId('status').textContent = 'LOCAL API · SYNTHETIC DATA · AS OF ' + data.fixtureAsOf;
  byId('spend').textContent = money(data.chargeback.totalOrgSpendUsd);
  byId('used').textContent = data.org.utilizationPct.toFixed(1) + '%';
  byId('budget').textContent = 'Of ' + money(data.org.monthlyBudgetUsd) + ' sample budget';
  byId('forecast').textContent = money(data.forecast.forecastMonthEndUsd);
  byId('events').textContent = String(data.chargeback.totalEvents);
  byId('forecast-detail').textContent = money(data.forecast.forecastMonthEndUsd);
  byId('method').textContent = data.forecast.forecastMethod.replace('-', ' ');
  byId('range').textContent = money(data.forecast.illustrativeRangeUsd.low) + ' – ' + money(data.forecast.illustrativeRangeUsd.high);
  byId('budget-detail').textContent = money(data.org.monthlyBudgetUsd);
  byId('days').textContent = String(data.forecast.daysObserved) + ' / ' + String(data.forecast.daysInMonth);

  const daily = byId('daily');
  const maximum = Math.max(1, ...data.series.map((day) => day.costUsd));
  for (const day of data.series) {
    const column = document.createElement('div');
    column.className = 'day';
    const value = document.createElement('div');
    value.className = 'day-value';
    value.textContent = money(day.costUsd);
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = Math.max(4, Math.round(day.costUsd / maximum * 175)) + 'px';
    const label = document.createElement('div');
    label.className = 'day-label';
    label.textContent = day.date.slice(5);
    column.append(value, bar, label);
    daily.appendChild(column);
  }

  const departments = byId('departments');
  for (const department of data.chargeback.departments) {
    const row = document.createElement('tr');
    addCell(row, department.department);
    addCell(row, money(department.totalCostUsd));
    const share = addCell(row, department.share.toFixed(1) + '%');
    const track = document.createElement('div');
    track.className = 'share-track';
    const fill = document.createElement('span');
    fill.className = 'share-fill';
    fill.style.width = Math.max(0, Math.min(100, department.share)) + '%';
    track.appendChild(fill);
    share.appendChild(track);
    addCell(row, department.eventCount);
    addCell(row, department.topProject.project);
    departments.appendChild(row);
  }
}

render().catch(() => { byId('status').textContent = 'Fixture unavailable. Start the local API to view this console.'; });
