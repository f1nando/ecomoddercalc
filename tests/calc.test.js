import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, PROFILES, calculate, parseSpeeds, validate, csv } from '../public/calc.js';
import { PRESETS } from '../public/presets.js';
const near = (actual, expected, epsilon=1e-8) => assert.ok(Math.abs(actual-expected)<epsilon, `${actual} != ${expected}`);
test('all 30 exercise variants are distinct and FH16 is correct',()=>{
  assert.equal(PRESETS.length,30);assert.equal(new Set(PRESETS.map(p=>p.id)).size,30);
  assert.deepEqual(PRESETS[12],{id:13,name:'Volvo FH16',mass:20000,efficiency:90,cd:.64,area:8.5});
});
test('FH16 Eco profile golden engine powers',()=>{
  for (const [V,N] of [[0,0],[16,11.94771992074379],[32,25.845581588172536],[48,43.64372674897119],[64,67.29229714982472],[80,98.74143453741807],[97,142.88454121704007],[100,151.99332266422803]]) near(calculate(V,DEFAULTS).engineKW,N);
});
test('Vehicle Physics matches all 15 real form rounded-watt observations',()=>{
  const p={...DEFAULTS,...PROFILES.vehicle};
  for(const [V,W] of [[0,0],[16,11941],[32,25766],[48,43362],[64,66612],[80,97401],[97,140485],[100,149362]])assert.equal(Math.round(calculate(V,p).engineKW*1000),W);
  for(const [angle,W] of [[0,11941],[5,96341],[10,180010],[15,262312],[20,342619],[25,420322],[30,494828]])assert.equal(Math.round(calculate(16,{...p,grade:Math.tan(angle*Math.PI/180)*100}).engineKW*1000),W);
});
test('archived VW Golf wheel Watts, exact 10 mph (not rounded 16 km/h)',()=>{
  const p={...DEFAULTS,...PRESETS[0]};
  near(calculate(10*1.609344,p).wheelKW*1000,744.64,.01);
});
test('wheel power excludes transmission loss; engine includes it only once',()=>{
  const p={...DEFAULTS,auxiliary:1200};const r=calculate(80,p);
  near((r.engineKW-1.2)*.9,r.wheelKW);near(r.rollingKW+r.aeroKW+r.gradeKW,r.wheelKW);
});
test('wind raises aero resistance, and rolling force stays unchanged',()=>{
  const a=calculate(80,DEFAULTS),b=calculate(80,{...DEFAULTS,wind:20});
  assert.ok(b.aeroForce>a.aeroForce);near(b.rollingForce,a.rollingForce);
});
test('zero speed has zero wheel power; auxiliary and idle fuel remain honest',()=>{
  const a=calculate(0,DEFAULTS),b=calculate(0,{...DEFAULTS,auxiliary:1000});
  assert.equal(a.engineKW,0);assert.equal(a.litresPer100,null);assert.equal(b.wheelKW,0);assert.equal(b.engineKW,1);assert.ok(b.fuelLitresPerHour>0);assert.equal(b.litresPer100,null);
});
test('fuel thermal efficiency affects fuel, never required mechanical power',()=>{
  const a=calculate(80,DEFAULTS),b=calculate(80,{...DEFAULTS,engineEfficiency:20});
  near(a.engineKW,b.engineKW);near(b.litresPer100,a.litresPer100*2);
});
test('speed list accepts decimal comma, deduplicates and sorts exactly',()=>{
  assert.deepEqual(parseSpeeds('97; 16; 0; 16; 32,5; 48.25'),[0,16,32.5,48.25,97]);
});
test('bad or excessive speed lists fail closed',()=>{
  for(const value of ['', ' ', '16,32,48','-2','401','NaN','<img>',Array(41).fill('2').join(';')])assert.throws(()=>parseSpeeds(value));
});
test('invalid numeric values never silently become defaults or zero',()=>{
  for(const value of [NaN,Infinity,-1,0,'90',null,undefined])assert.throws(()=>validate({...DEFAULTS,efficiency:value}));
  assert.throws(()=>calculate(500,DEFAULTS));assert.throws(()=>calculate(20,{...DEFAULTS,grade:-5}));
});
test('inputs are not mutated',()=>{
  const p={...DEFAULTS},before={...p};calculate(100,p);assert.deepEqual(p,before);
});
test('CSV contains run parameters and no fake per-distance zero at standstill',()=>{
  const rows=[calculate(0,DEFAULTS),calculate(97,DEFAULTS)];
  const result=csv(rows,{profile:'eco',preset:'13',parameters:DEFAULTS});
  assert.ok(result.startsWith('\uFEFF'));assert.ok(result.includes('# mass=20000'));assert.ok(result.includes('142,884541'));assert.ok(result.includes('"0";"2353,596";"0";"0";"0";"0";""'));
});
