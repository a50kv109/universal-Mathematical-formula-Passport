/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Atom,
  Binary,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  GitCompare,
  Globe,
  Layers,
  Play,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { AstTreeView } from './components/AstTreeView';
import {
  COMPARE_PRESETS,
  CONSTRUCT_MATRIX,
  DOMAIN_LIST,
  FORMULA_PRESETS,
  LOGICAL_CLASS_MATRIX,
} from './data/umfpCatalog';
import { CONSTANT_REGISTRY, NUMERIC_SPECIAL_REGISTRY } from './umfp-core/constantRegistry';
import { comparePassports } from './umfp-core/equivalence';
import { GoldenTestSuiteSummary, runAllGoldenTests } from './umfp-core/golden-tests';
import { generatePassport } from './umfp-core/passport';
import { AstNode, FormulaPassport, NumberDomain } from './umfp-core/types';

type TabKey = 'lab' | 'parser' | 'classes' | 'comparator' | 'ai' | 'spec';

interface AiAuditProposal {
  aiProposed: boolean;
  verificationStatus: 'unverified';
  proposedDomain?: string;
  proposedLogicalClass?: string;
  mathematicalObject?: string;
  semantics?: {
    entities?: string[];
    relation?: string;
  };
  proposedInvariants?: string[];
  equivalentFormHints?: string[];
  aiCritique?: string;
}

interface AiCompareCommentary {
  aiProposed: boolean;
  verificationStatus: 'unverified';
  structuralComparison?: string;
  logicalComparison?: string;
  explanation?: string;
  error?: string;
}

export default function App() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [activeTab, setActiveTab] = useState<TabKey>('lab');

  // Inspector state (always starts deterministic via umfp-core)
  const [inspectorExpr, setInspectorExpr] = useState<string>(FORMULA_PRESETS[0].formula);
  const [astMode, setAstMode] = useState<'raw' | 'normalized'>('raw');
  const [numberDomain, setNumberDomain] = useState<NumberDomain>('REAL');
  const [domainHint, setDomainHint] = useState<string>('Алгебра');
  const [contextNote, setContextNote] = useState<string>('');

  // Exploratory Gemini AI state (strictly optional and marked unverified)
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<AiAuditProposal | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Parser & Golden tests state
  const [parserExpr, setParserExpr] = useState<string>('\\frac{\\sqrt{a+b}}{\\frac{c+d}{e}}');
  const [parserAstMode, setParserAstMode] = useState<'raw' | 'normalized'>('raw');
  const [goldenSummary, setGoldenSummary] = useState<GoldenTestSuiteSummary | null>(null);

  // Comparator state
  const [compFormulaA, setCompFormulaA] = useState<string>('\\frac{a+b}{c-d}');
  const [compFormulaB, setCompFormulaB] = useState<string>('(a+b)/(c-d)');
  const [isComparingAi, setIsComparingAi] = useState(false);
  const [aiCompareResult, setAiCompareResult] = useState<AiCompareCommentary | null>(null);

  // Deterministic passports computed in real time
  const inspectorPassport: FormulaPassport = useMemo(
    () => generatePassport(inspectorExpr, { numberDomain }),
    [inspectorExpr, numberDomain]
  );

  const parserPassport: FormulaPassport = useMemo(
    () => generatePassport(parserExpr, { numberDomain }),
    [parserExpr, numberDomain]
  );

  const passportA = useMemo(
    () => generatePassport(compFormulaA, { numberDomain }),
    [compFormulaA, numberDomain]
  );
  const passportB = useMemo(
    () => generatePassport(compFormulaB, { numberDomain }),
    [compFormulaB, numberDomain]
  );
  const equivalenceReport = useMemo(
    () => comparePassports(passportA, passportB),
    [passportA, passportB]
  );

  const labels = {
    ru: {
      brand: 'UMFP-Lab',
      version: '0.1.x — Experimental Research Release',
      subtitle: 'Детерминированное математическое ядро и композиционная паспортизация',
      tabLab: 'Инспектор паспортов',
      tabParser: 'Парсер и Тесты',
      tabClasses: 'Конструкции и Классы',
      tabComparator: 'Эквивалентность',
      tabAi: 'Аудитор ИИ',
      tabSpec: 'Спецификация',
      presets: 'Контрольные формулы',
      liveFormula: 'Выражение (LaTeX или текст)',
      askAi: 'Запросить Gemini AI (Исследовательская гипотеза)',
      analyzing: 'Запрос к Gemini AI...',
      parseStatus: 'Статус разбора',
      structuralId: 'Structural ID',
      schemaId: 'Schema ID',
      logicalClassId: 'Logical Class ID',
      compositionalTitle: 'Композиционные структуры (Level A)',
      foundConstructs: 'Обнаруженные конструкции',
      noConstructs: 'Композиционные конструкции не обнаружены (атомарное / плоское выражение)',
      compDepth: 'Глубина композиции',
      fracDepth: 'Глубина дробей',
      parenDepth: 'Глубина скобок (RAW)',
      astDepth: 'Глубина AST',
      nodeCount: 'Узлов AST',
      fractionSlotsTitle: 'Дерево слотов дробей (NUMERATOR / DENOMINATOR)',
      constraintsTitle: 'Обязательные ограничения области определения',
      noConstraints: 'Дополнительных ограничений знаменателей и чётных корней не выявлено.',
      astInspectorTitle: 'Инспектор AST',
      rawAst: 'RAW AST (поверхностная запись)',
      normalizedAst: 'NORMALIZED AST (канонический)',
      levelATitle: 'Уровень A · Морфология',
      levelBTitle: 'Уровень B · Логическая организация',
      levelCTitle: 'Уровень C · Математические области',
      aiBannerTitle: 'Исследовательская интерпретация Gemini AI',
      aiUnverifiedTag: 'AI-proposed / unverified',
      matrixTitleA: 'Матрица 1 (Level A): Структурные конструкции',
      matrixDescA: 'Контейнерные математические формы с именованными слотами, отделённые от логических классов.',
      matrixTitleB: 'Матрица 2 (Level B): Логические классы',
      matrixDescB: 'Организация закономерностей. Класс RATIONAL_EXPRESSION не назначается автоматически только по факту дроби.',
      matrixTitleC: 'Уровень C: Математические домены',
      inspectInLab: 'Открыть в инспекторе',
      compTitle: 'Независимое сравнение структуры, класса и эквивалентности',
      compDesc: 'Ядро раздельно оценивает: (1) Структурное отношение, (2) Совпадение логического класса и (3) Математическую эквивалентность.',
      runGoldenTests: 'Выполнить Golden Test Matrix',
      aiLabTitle: 'Аудитор ИИ (Exploratory Research Workbench)',
      aiLabDesc: 'Gemini AI используется только как исследовательский ассистент. Детерминированные поля ядра защищены от перезаписи.',
    },
    en: {
      brand: 'UMFP-Lab',
      version: '0.1.x — Experimental Research Release',
      subtitle: 'Deterministic Mathematical Core & Compositional Formula Passports',
      tabLab: 'Passport Inspector',
      tabParser: 'Parser & Tests',
      tabClasses: 'Constructs & Classes',
      tabComparator: 'Equivalence',
      tabAi: 'AI Auditor',
      tabSpec: 'UMFP Spec',
      presets: 'Reference Formulas',
      liveFormula: 'Formula Expression (LaTeX or Linear)',
      askAi: 'Ask Gemini AI (Exploratory Hypothesis)',
      analyzing: 'Querying Gemini AI...',
      parseStatus: 'Parse Status',
      structuralId: 'Structural ID',
      schemaId: 'Schema ID',
      logicalClassId: 'Logical Class ID',
      compositionalTitle: 'Compositional Structures (Level A)',
      foundConstructs: 'Detected Constructs',
      noConstructs: 'No compositional constructs detected (flat/atomic arithmetic expression)',
      compDepth: 'Composition Depth',
      fracDepth: 'Fraction Depth',
      parenDepth: 'Paren Depth (RAW)',
      astDepth: 'AST Depth',
      nodeCount: 'AST Nodes',
      fractionSlotsTitle: 'Fraction Slot Subtrees (NUMERATOR / DENOMINATOR)',
      constraintsTitle: 'Mandatory Domain Constraints',
      noConstraints: 'No nonzero-denominator or even-radical domain constraints required.',
      astInspectorTitle: 'AST Inspector',
      rawAst: 'RAW AST (surface syntax)',
      normalizedAst: 'NORMALIZED AST (canonical)',
      levelATitle: 'Level A · Morphology',
      levelBTitle: 'Level B · Logical Organization',
      levelCTitle: 'Level C · Mathematical Domains',
      aiBannerTitle: 'Gemini AI Exploratory Interpretation',
      aiUnverifiedTag: 'AI-proposed / unverified',
      matrixTitleA: 'Matrix 1 (Level A): Structural Constructs',
      matrixDescA: 'Container constructs with named slots, strictly separated from logical organization classes.',
      matrixTitleB: 'Matrix 2 (Level B): Logical Organization Classes',
      matrixDescB: 'Behavioral taxonomy. RATIONAL_EXPRESSION is never assigned solely because FRACTION exists.',
      matrixTitleC: 'Level C: Mathematical Domains',
      inspectInLab: 'Inspect in Lab',
      compTitle: 'Independent Structural, Logical & Equivalence Comparator',
      compDesc: 'Deterministic engine evaluates: (1) Structural Relation, (2) Logical Class Relation, (3) Mathematical Equivalence.',
      runGoldenTests: 'Run Golden Test Matrix',
      aiLabTitle: 'Gemini AI Exploratory Research Workbench',
      aiLabDesc: 'Gemini AI acts purely as an exploratory research assistant; deterministic core fields remain authoritative.',
    },
  };

  const t = labels[lang];

  const handleRunAiAudit = async (formula: string) => {
    setIsAuditing(true);
    setAuditError(null);
    const detPassport = generatePassport(formula, { numberDomain });
    try {
      const res = await fetch('/api/umfp/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formula,
          domain: domainHint,
          description: contextNote,
          deterministicSummary: {
            structuralId: detPassport.structuralId,
            structuralSchemaId: detPassport.structuralSchemaId,
            logicalClassId: detPassport.logicalClassId,
            structuralConstructs: detPassport.features.structuralConstructs,
            logicalOrganizations: detPassport.logicalOrganizations,
            constraints: detPassport.constraints,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setAiAuditResult(data);
    } catch (err: any) {
      setAuditError(err.message || 'AI audit request failed');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRunAiCompare = async () => {
    setIsComparingAi(true);
    setAiCompareResult(null);
    try {
      const res = await fetch('/api/umfp/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formulaA: compFormulaA,
          formulaB: compFormulaB,
          deterministicComparison: equivalenceReport,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison failed');
      setAiCompareResult(data);
    } catch (err: any) {
      setAiCompareResult({
        aiProposed: true,
        verificationStatus: 'unverified',
        error: err.message,
      });
    } finally {
      setIsComparingAi(false);
    }
  };

  const collectFractionNodes = (node: AstNode): AstNode[] => {
    const out: AstNode[] = [];
    const seen = new Set<AstNode>();
    const visit = (n: AstNode) => {
      if (seen.has(n)) return;
      seen.add(n);
      if (n.kind === 'fraction') out.push(n);
      for (const c of n.children) visit(c);
      if (n.slots) {
        for (const v of Object.values(n.slots)) {
          if (Array.isArray(v)) v.forEach(visit);
          else if (v) visit(v);
        }
      }
    };
    visit(node);
    return out;
  };

  const renderNodePreview = (node: AstNode | AstNode[] | undefined): string => {
    if (!node) return '?';
    if (Array.isArray(node)) return `${node.length} items`;
    return node.raw?.trim() || node.value || node.kind;
  };

  const inspectorFractionNodes = useMemo(
    () => collectFractionNodes(inspectorPassport.rawAst),
    [inspectorPassport]
  );

  const navItems: Array<{ id: TabKey; label: string; icon: React.ReactNode }> = [
    { id: 'lab', label: t.tabLab, icon: <Sliders className="h-3.5 w-3.5" /> },
    { id: 'parser', label: t.tabParser, icon: <Code2 className="h-3.5 w-3.5" /> },
    { id: 'classes', label: t.tabClasses, icon: <Compass className="h-3.5 w-3.5" /> },
    { id: 'comparator', label: t.tabComparator, icon: <GitCompare className="h-3.5 w-3.5" /> },
    { id: 'ai', label: t.tabAi, icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: 'spec', label: t.tabSpec, icon: <BookOpen className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white">
      {/* Top Instrument Bar */}
      <header className="border-b border-slate-800/90 bg-[#0b101b]/95 backdrop-blur sticky top-0 z-50 px-5 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <div className="h-9 w-9 rounded-md bg-slate-900 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Atom className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h1 className="font-semibold text-base tracking-tight text-white">
                  {t.brand}
                </h1>
                <span className="font-mono text-xs text-cyan-400 tabular-nums">
                  v{t.version}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[340px] hidden xl:block">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto">
            <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-md border border-slate-800">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <button
              onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              title="Переключить язык / Toggle Language"
            >
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
              <span>{lang === 'ru' ? 'EN' : 'RU'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 py-6">
        {/* TAB 1: PASSPORT INSPECTOR */}
        {activeTab === 'lab' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar: Live Formula Input & Presets */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                    {t.liveFormula}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    umfp-core deterministic
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={inspectorExpr}
                  onChange={(e) => {
                    setInspectorExpr(e.target.value);
                    setAiAuditResult(null);
                  }}
                  placeholder="\frac{a+b}{c-d} or int(a,b,f(x),x)"
                  className="w-full bg-[#070a11] border border-slate-700 rounded-md px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />

                <div className="flex items-center justify-between gap-2 bg-[#070a11] border border-slate-800 rounded px-2.5 py-1.5">
                  <span className="text-[11px] font-mono text-slate-400">
                    {lang === 'ru' ? 'Числовая область:' : 'Number Domain:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {(['REAL', 'COMPLEX'] as NumberDomain[]).map((nd) => (
                      <button
                        key={nd}
                        onClick={() => setNumberDomain(nd)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                          numberDomain === nd
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {nd}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={domainHint}
                    onChange={(e) => setDomainHint(e.target.value)}
                    placeholder={lang === 'ru' ? 'Область (подсказка для ИИ)' : 'Domain hint for AI'}
                    className="bg-[#070a11] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={contextNote}
                    onChange={(e) => setContextNote(e.target.value)}
                    placeholder={lang === 'ru' ? 'Контекст формулы' : 'Formula context'}
                    className="bg-[#070a11] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  onClick={() => handleRunAiAudit(inspectorExpr)}
                  disabled={isAuditing || !inspectorExpr.trim()}
                  className="w-full py-2 px-3 rounded-md bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{t.analyzing}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{t.askAi}</span>
                    </>
                  )}
                </button>
                {auditError && (
                  <p className="text-xs font-mono text-rose-400">{auditError}</p>
                )}
              </div>

              {/* Presets List */}
              <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                    {t.presets}
                  </span>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {FORMULA_PRESETS.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {FORMULA_PRESETS.map((preset) => {
                    const active = inspectorExpr === preset.formula;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setInspectorExpr(preset.formula);
                          setAiAuditResult(null);
                        }}
                        className={`text-left p-2.5 rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                            : 'bg-[#090d16] border-slate-800/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-medium">{preset.name[lang]}</div>
                        <div className="font-mono text-xs text-cyan-300 mt-1 truncate">
                          {preset.formula}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {preset.note[lang]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Main Column: Deterministic UMFP 0.1.x Passport */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* Identity Strip */}
              <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex flex-wrap items-center gap-2">
                      <span>UMFP {inspectorPassport.umfpVersion}</span>
                      <span>·</span>
                      <span
                        className={
                          inspectorPassport.parseStatus === 'parsed'
                            ? 'text-emerald-400'
                            : inspectorPassport.parseStatus === 'partial'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {t.parseStatus}: {inspectorPassport.parseStatus}
                      </span>
                      <span>·</span>
                      <span className="text-cyan-300">domain={inspectorPassport.numberDomain}</span>
                      {inspectorPassport.validationErrors.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-rose-400 font-semibold">
                            errors: {inspectorPassport.validationErrors.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 font-mono text-xl text-white bg-[#070a11] border border-slate-800 rounded-md px-4 py-2.5 break-all">
                      {inspectorPassport.sourceExpression || '—'}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 font-mono text-xs shrink-0 md:text-right tabular-nums">
                    <div>
                      <span className="text-slate-500">{t.structuralId}: </span>
                      <span className="text-cyan-300 font-semibold">
                        {inspectorPassport.structuralId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t.schemaId}: </span>
                      <span className="text-sky-300">
                        {inspectorPassport.structuralSchemaId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t.logicalClassId}: </span>
                      <span className="text-indigo-300 font-semibold">
                        {inspectorPassport.logicalClassId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* COMPOSITIONAL STRUCTURES SECTION */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{t.compositionalTitle}</span>
                    </h2>
                  </div>

                  {/* Depth Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="bg-[#090d16] border border-slate-800 rounded p-2.5">
                      <div className="text-[11px] text-slate-400">{t.compDepth}</div>
                      <div className="font-mono text-lg font-semibold text-white tabular-nums mt-0.5">
                        {inspectorPassport.features.maximumCompositionDepth}
                      </div>
                    </div>
                    <div className="bg-[#090d16] border border-slate-800 rounded p-2.5">
                      <div className="text-[11px] text-slate-400">{t.fracDepth}</div>
                      <div className="font-mono text-lg font-semibold text-cyan-300 tabular-nums mt-0.5">
                        {inspectorPassport.features.maximumFractionDepth === null
                          ? 'null'
                          : inspectorPassport.features.maximumFractionDepth}
                      </div>
                    </div>
                    <div className="bg-[#090d16] border border-slate-800 rounded p-2.5">
                      <div className="text-[11px] text-slate-400">{t.parenDepth}</div>
                      <div className="font-mono text-lg font-semibold text-slate-200 tabular-nums mt-0.5">
                        {inspectorPassport.features.parenthesisDepth}
                      </div>
                    </div>
                    <div className="bg-[#090d16] border border-slate-800 rounded p-2.5">
                      <div className="text-[11px] text-slate-400">{t.astDepth}</div>
                      <div className="font-mono text-lg font-semibold text-slate-200 tabular-nums mt-0.5">
                        {inspectorPassport.features.maximumDepth}
                      </div>
                    </div>
                    <div className="bg-[#090d16] border border-slate-800 rounded p-2.5">
                      <div className="text-[11px] text-slate-400">{t.nodeCount}</div>
                      <div className="font-mono text-lg font-semibold text-slate-200 tabular-nums mt-0.5">
                        {inspectorPassport.features.nodeCount}
                      </div>
                    </div>
                  </div>

                  {/* Construct Counts */}
                  <div className="bg-[#090d16] border border-slate-800 rounded p-3">
                    <div className="text-[11px] font-mono text-slate-400 mb-2">
                      {t.foundConstructs}
                    </div>
                    {Object.keys(inspectorPassport.features.structuralConstructs).length === 0 ? (
                      <div className="text-xs text-slate-500">{t.noConstructs}</div>
                    ) : (
                      <div className="flex flex-wrap gap-3 font-mono text-xs tabular-nums">
                        {Object.entries(inspectorPassport.features.structuralConstructs).map(
                          ([kind, count]) => (
                            <div
                              key={kind}
                              className="px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/30 text-cyan-300"
                            >
                              {kind}: <strong className="text-white">{count}</strong>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visual Fraction Subtrees (NUMERATOR / DENOMINATOR) */}
                  {inspectorPassport.fractionDetails.length > 0 && (
                    <div className="bg-[#090d16] border border-slate-800 rounded p-3 flex flex-col gap-3">
                      <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                        {t.fractionSlotsTitle}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {inspectorPassport.fractionDetails.map((fd, idx) => (
                          <div
                            key={idx}
                            className="bg-[#070a11] border border-slate-800 rounded p-3 font-mono text-xs flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
                              <span className="text-slate-300 font-semibold">
                                FRACTION #{idx + 1}
                              </span>
                              <span className="text-slate-400">
                                rep={fd.representation} · depth={fd.nestingDepth}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="text-[11px] text-amber-300">
                                NUMERATOR:{' '}
                                <span className="text-white">{fd.numeratorRaw}</span>
                                {fd.numeratorConstructs.length > 0 && (
                                  <span className="text-cyan-400 ml-1">
                                    [{fd.numeratorConstructs.join(', ')}]
                                  </span>
                                )}
                              </div>
                              <div className="border-t border-slate-700 my-0.5" />
                              <div className="text-[11px] text-emerald-300">
                                DENOMINATOR:{' '}
                                <span className="text-white">{fd.denominatorRaw}</span>
                                {fd.denominatorConstructs.length > 0 && (
                                  <span className="text-cyan-400 ml-1">
                                    [{fd.denominatorConstructs.join(', ')}]
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] text-rose-300 pt-1 border-t border-slate-800/80">
                              constraint: {fd.denominatorConstraint}
                            </div>
                          </div>
                        ))}
                      </div>
                      {inspectorFractionNodes.length > 0 && (
                        <div className="text-[11px] font-mono text-slate-500">
                          FRACTION root slots preview:{' '}
                          {inspectorFractionNodes
                            .map(
                              (fn, i) =>
                                `#${i + 1}[num=${renderNodePreview(fn.slots?.numerator)}, den=${renderNodePreview(
                                  fn.slots?.denominator
                                )}]`
                            )
                            .join(' · ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mandatory Constraints */}
                  <div className="bg-[#090d16] border border-slate-800 rounded p-3">
                    <div className="text-[11px] font-mono text-slate-400 mb-1.5">
                      {t.constraintsTitle}
                    </div>
                    {inspectorPassport.constraints.length === 0 ? (
                      <div className="text-xs text-slate-500">{t.noConstraints}</div>
                    ) : (
                      <div className="flex flex-col gap-1 font-mono text-xs">
                        {inspectorPassport.constraints.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 text-rose-300 bg-[#070a11] border border-slate-800/80 rounded px-2.5 py-1.5"
                          >
                            <span>{c.expression}</span>
                            <span className="text-[11px] text-slate-400">
                              {c.kind} · {c.sourceConstruct} · {c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Registered Mathematical Constants (Constant Registry) */}
                  <div className="bg-[#090d16] border border-slate-800 rounded p-3">
                    <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1.5">
                      {lang === 'ru'
                        ? 'Зарегистрированные математические константы (Constant Registry)'
                        : 'Registered Mathematical Constants (Constant Registry)'}
                    </div>
                    {inspectorPassport.constants.length === 0 ? (
                      <div className="text-xs text-slate-500">
                        {lang === 'ru'
                          ? 'Зарегистрированные математические константы в формуле не обнаружены.'
                          : 'No registered mathematical constants detected in this expression.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                        {inspectorPassport.constants.map((c) => (
                          <div
                            key={c.constantId}
                            className="bg-[#070a11] border border-amber-500/30 rounded p-2.5 flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-amber-300 font-semibold">
                                {c.symbol} · {c.canonicalName}
                              </span>
                              <span className="text-[11px] text-slate-400 tabular-nums">
                                x{c.occurrences}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {c.constantId} · {c.kind} · {c.numberDomain}
                            </div>
                            <div className="text-[11px] text-slate-300">
                              exact: <span className="text-white">{c.exactValue ?? '—'}</span>
                              {c.approximation !== null && (
                                <span className="text-slate-400 ml-2">
                                  approx: {c.approximation}
                                </span>
                              )}
                            </div>
                            {c.minimalPolynomial && (
                              <div className="text-[11px] text-cyan-300">
                                minPoly: {c.minimalPolynomial}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500">
                              props: {c.properties.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Separated 3 Levels Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div className="bg-[#090d16] border border-slate-800 rounded p-3 flex flex-col gap-1.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Binary className="h-3.5 w-3.5" />
                      <span>{t.levelATitle}</span>
                    </h3>
                    <div className="text-xs text-slate-300 font-mono">
                      <div>
                        <span className="text-slate-500">vars: </span>
                        {inspectorPassport.features.variables.join(', ') || '—'}
                      </div>
                      <div>
                        <span className="text-slate-500">consts: </span>
                        {inspectorPassport.features.constantValues.join(', ') || '—'} (
                        {inspectorPassport.features.constants})
                      </div>
                      <div>
                        <span className="text-slate-500">ops: </span>
                        {Object.entries(inspectorPassport.features.operations)
                          .map(([op, n]) => `${op}(${n})`)
                          .join(', ') || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#090d16] border border-slate-800 rounded p-3 flex flex-col gap-1.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      <span>{t.levelBTitle}</span>
                    </h3>
                    <div className="flex flex-col gap-1 font-mono text-xs text-indigo-200">
                      {inspectorPassport.logicalOrganizations.map((org) => (
                        <div key={org}>• {org}</div>
                      ))}
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        symmetry: <span className="text-indigo-300">{inspectorPassport.symmetryStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#090d16] border border-slate-800 rounded p-3 flex flex-col gap-1.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      <span>{t.levelCTitle}</span>
                    </h3>
                    <div className="flex flex-col gap-1 font-mono text-xs text-emerald-200">
                      <div>• {inspectorPassport.domainClassification.primaryDomain}</div>
                      <div className="text-[11px] text-slate-400">
                        {inspectorPassport.domainClassification.classificationMethod} · conf:{' '}
                        {inspectorPassport.domainClassification.confidence}
                      </div>
                      {inspectorPassport.domainClassification.reasons[0] && (
                        <div className="text-[11px] text-slate-400 font-sans leading-snug">
                          {inspectorPassport.domainClassification.reasons[0]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Diagnostics if any */}
                {inspectorPassport.diagnostics.length > 0 && (
                  <div className="bg-[#090d16] border border-amber-500/30 rounded p-3 flex flex-col gap-1">
                    {inspectorPassport.diagnostics.map((d, i) => (
                      <div key={i} className="text-xs font-mono text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          [{d.code}] {d.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Gemini Exploratory Hypothesis Panel (strictly separate & tagged unverified) */}
              {aiAuditResult && (
                <div className="bg-[#111524] border border-amber-500/40 rounded-lg p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-300">
                      <Sparkles className="h-4 w-4" />
                      <span>{t.aiBannerTitle}</span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-200 bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded">
                      {t.aiUnverifiedTag}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Proposed Logical Class: </span>
                      <span className="text-white font-medium">
                        {aiAuditResult.proposedLogicalClass || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Proposed Domain: </span>
                      <span className="text-white font-mono">
                        {aiAuditResult.proposedDomain || '—'}
                      </span>
                    </div>
                    {aiAuditResult.semantics?.relation && (
                      <div className="md:col-span-2 text-slate-300">
                        <span className="text-slate-400">Semantic relation: </span>
                        {aiAuditResult.semantics.relation}
                      </div>
                    )}
                    {aiAuditResult.aiCritique && (
                      <div className="md:col-span-2 text-slate-200 bg-[#080c14] border border-slate-800 rounded p-3 leading-relaxed">
                        {aiAuditResult.aiCritique}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RAW vs NORMALIZED AST Switchable Panel */}
              <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                    {t.astInspectorTitle}
                  </span>
                  <div className="flex items-center gap-1 bg-[#070a11] p-1 rounded border border-slate-800">
                    <button
                      onClick={() => setAstMode('raw')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                        astMode === 'raw'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.rawAst}
                    </button>
                    <button
                      onClick={() => setAstMode('normalized')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                        astMode === 'normalized'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.normalizedAst}
                    </button>
                  </div>
                </div>
                <div className="bg-[#070a11] border border-slate-800/90 rounded p-3 max-h-[340px] overflow-auto">
                  <AstTreeView
                    node={
                      astMode === 'raw'
                        ? inspectorPassport.rawAst
                        : inspectorPassport.normalizedAst
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PARSER, AST & GOLDEN TEST MATRIX */}
        {activeTab === 'parser' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {lang === 'ru'
                      ? 'Детерминированный парсер UMFP 0.1.x и Golden Test Matrix'
                      : 'UMFP 0.1.x Deterministic Parser & Golden Test Matrix'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'ru'
                      ? '123 детерминированных теста: 14 конструктов, 11 проверок дробей, 5 M1-регрессий, Recovery, Constant Registry, Q2 (области видимости) и Q3 (числовые домены).'
                      : '123 deterministic tests: 14 constructs, 11 fraction checks, 5 M1 regressions, recovery checks, Constant Registry, Q2 variable scopes, and Q3 number domains.'}
                  </p>
                </div>
                <button
                  onClick={() => setGoldenSummary(runAllGoldenTests())}
                  className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{t.runGoldenTests}</span>
                </button>
              </div>

              {goldenSummary && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 font-mono text-xs tabular-nums bg-[#070a11] border border-slate-800 rounded p-3">
                    <span>Total: {goldenSummary.total}</span>
                    <span className="text-emerald-400">Passed: {goldenSummary.passed}</span>
                    <span className={goldenSummary.failed > 0 ? 'text-rose-400' : 'text-slate-400'}>
                      Failed: {goldenSummary.failed}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[380px] overflow-auto pr-1">
                    {goldenSummary.results.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setParserExpr(r.expression.includes(' vs ') ? '\\frac{a+b}{c-d}' : r.expression)}
                        className={`p-2.5 rounded border font-mono text-xs cursor-pointer transition-colors ${
                          r.passed
                            ? 'bg-[#090d16] border-slate-800 hover:border-slate-700'
                            : 'bg-rose-950/30 border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white">{r.id}</span>
                          {r.passed ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> PASS
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> FAIL
                            </span>
                          )}
                        </div>
                        <div className="text-cyan-300 truncate mt-1">{r.expression}</div>
                        <div className="text-[11px] text-slate-400 mt-1 truncate">{r.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Expression AST + JSON Inspector */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-mono text-slate-400">{t.liveFormula}</label>
                <input
                  type="text"
                  value={parserExpr}
                  onChange={(e) => setParserExpr(e.target.value)}
                  className="bg-[#070a11] border border-slate-700 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#070a11] border border-slate-800 rounded p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-400">{t.astInspectorTitle}</span>
                    <div className="flex gap-1 text-[11px] font-mono">
                      <button
                        onClick={() => setParserAstMode('raw')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          parserAstMode === 'raw' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500'
                        }`}
                      >
                        RAW
                      </button>
                      <button
                        onClick={() => setParserAstMode('normalized')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          parserAstMode === 'normalized'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'text-slate-500'
                        }`}
                      >
                        NORMALIZED
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[420px] overflow-auto">
                    <AstTreeView
                      node={
                        parserAstMode === 'raw'
                          ? parserPassport.rawAst
                          : parserPassport.normalizedAst
                      }
                    />
                  </div>
                </div>

                <div className="bg-[#070a11] border border-slate-800 rounded p-3 flex flex-col gap-2">
                  <span className="text-xs font-mono text-indigo-400">
                    FormulaPassport JSON (umfp-core)
                  </span>
                  <pre className="text-[11px] font-mono text-slate-300 max-h-[420px] overflow-auto">
                    {JSON.stringify(
                      {
                        umfpVersion: parserPassport.umfpVersion,
                        parseStatus: parserPassport.parseStatus,
                        numberDomain: parserPassport.numberDomain,
                        structuralId: parserPassport.structuralId,
                        structuralSchemaId: parserPassport.structuralSchemaId,
                        canonicalExact: parserPassport.canonicalExact,
                        logicalClassId: parserPassport.logicalClassId,
                        constants: parserPassport.constants,
                        symmetryStatus: parserPassport.symmetryStatus,
                        validationErrors: parserPassport.validationErrors,
                        features: parserPassport.features,
                        fractionDetails: parserPassport.fractionDetails,
                        constraints: parserPassport.constraints,
                        logicalOrganizations: parserPassport.logicalOrganizations,
                        domainClassification: parserPassport.domainClassification,
                        diagnostics: parserPassport.diagnostics,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STRICTLY SEPARATED LEVEL A / B / C MATRICES */}
        {activeTab === 'classes' && (
          <div className="flex flex-col gap-8">
            {/* Level A: Structural Constructs Matrix */}
            <section className="flex flex-col gap-3">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-base font-semibold text-cyan-300">{t.matrixTitleA}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t.matrixDescA}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {CONSTRUCT_MATRIX.map((c) => (
                  <div
                    key={c.kind}
                    className="bg-[#0e1422] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="font-mono text-xs text-cyan-400 font-semibold">{c.kind}</div>
                      <div className="text-sm font-medium text-white mt-0.5">{c.name[lang]}</div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {c.desc[lang]}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] font-mono text-slate-400">
                        slots: {c.slots.join(', ')}
                      </div>
                      <div className="font-mono text-xs text-slate-200 bg-[#070a11] border border-slate-800 rounded px-2 py-1 truncate">
                        {c.sample}
                      </div>
                      <button
                        onClick={() => {
                          setInspectorExpr(c.sample);
                          setActiveTab('lab');
                        }}
                        className="text-left text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        {t.inspectInLab} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Level B: Logical Organizations Matrix */}
            <section className="flex flex-col gap-3">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-base font-semibold text-indigo-300">{t.matrixTitleB}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t.matrixDescB}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {LOGICAL_CLASS_MATRIX.map((lc) => (
                  <div
                    key={lc.kind}
                    className="bg-[#0e1422] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-indigo-400 font-semibold">{lc.kind}</span>
                        <span className="text-slate-500">{lc.code}</span>
                      </div>
                      <div className="text-sm font-medium text-white mt-0.5">{lc.name[lang]}</div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {lc.desc[lang]}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setInspectorExpr(lc.sample);
                        setActiveTab('lab');
                      }}
                      className="text-left text-[11px] font-mono text-indigo-400 hover:text-indigo-300 pt-2 border-t border-slate-800/80 cursor-pointer"
                    >
                      {lc.sample} · {t.inspectInLab} →
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Level C: Domains */}
            <section className="flex flex-col gap-3">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-base font-semibold text-emerald-300">{t.matrixTitleC}</h2>
              </div>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                {DOMAIN_LIST.map((dom) => (
                  <span
                    key={dom}
                    className="px-3 py-1.5 rounded bg-[#0e1422] border border-slate-800 text-emerald-300"
                  >
                    {dom}
                  </span>
                ))}
              </div>
            </section>

            {/* Constant Registry Layer */}
            <section className="flex flex-col gap-3">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-base font-semibold text-amber-300">
                  {lang === 'ru'
                    ? 'Реестр математических констант (Constant Registry) и NUMERIC_SPECIAL'
                    : 'Constant Registry & NUMERIC_SPECIAL Elements'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'ru'
                    ? 'Математические константы идентифицируются как самостоятельные сущности (constant_ref) и не смешиваются с переменными, приближениями или конструкциями.'
                    : 'Mathematical constants are typed entities (constant_ref) separated from variables, decimal approximations, and structural constructs.'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...CONSTANT_REGISTRY, ...NUMERIC_SPECIAL_REGISTRY].map((c) => (
                  <div
                    key={c.constantId}
                    className="bg-[#0e1422] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-1.5 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300 font-semibold">
                        {c.symbol} · {c.canonicalName}
                      </span>
                      <span className="text-[11px] text-slate-400">{c.kind}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {c.constantId} · {c.numberDomain}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      exact: <span className="text-white">{c.exactValue ?? '—'}</span>
                      {c.approximation !== null && (
                        <span className="text-slate-400 ml-2">approx: {c.approximation}</span>
                      )}
                    </div>
                    {c.minimalPolynomial && (
                      <div className="text-[11px] text-cyan-300">
                        minPoly: {c.minimalPolynomial}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 font-sans">
                      {c.definition}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      aliases: {c.aliases.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 4: EQUIVALENCE & STRUCTURE COMPARATOR */}
        {activeTab === 'comparator' && (
          <div className="flex flex-col gap-5">
            <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{t.compTitle}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{t.compDesc}</p>
                </div>
                <div className="flex items-center gap-1 bg-[#070a11] border border-slate-800 rounded p-1 shrink-0">
                  {(['REAL', 'COMPLEX'] as NumberDomain[]).map((nd) => (
                    <button
                      key={nd}
                      onClick={() => setNumberDomain(nd)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                        numberDomain === nd
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {nd}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {COMPARE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCompFormulaA(p.a);
                      setCompFormulaB(p.b);
                      setAiCompareResult(null);
                    }}
                    className="px-2.5 py-1.5 rounded text-xs bg-[#090d16] hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                  >
                    {p.label[lang]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">
                    Formula A
                  </label>
                  <input
                    type="text"
                    value={compFormulaA}
                    onChange={(e) => setCompFormulaA(e.target.value)}
                    className="w-full bg-[#070a11] border border-slate-700 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">
                    Formula B
                  </label>
                  <input
                    type="text"
                    value={compFormulaB}
                    onChange={(e) => setCompFormulaB(e.target.value)}
                    className="w-full bg-[#070a11] border border-slate-700 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Three Independent Deterministic Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. Structural Relation */}
                <div className="bg-[#090d16] border border-slate-800 rounded p-4 flex flex-col gap-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                    1. Structural Relation
                  </div>
                  <div className="font-mono text-sm font-semibold text-white">
                    {equivalenceReport.structuralRelation.status}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 space-y-1">
                    <div>A: {equivalenceReport.structuralRelation.structuralIdA}</div>
                    <div>B: {equivalenceReport.structuralRelation.structuralIdB}</div>
                    <div>
                      Schema A/B:{' '}
                      {equivalenceReport.structuralRelation.schemaIdA ===
                      equivalenceReport.structuralRelation.schemaIdB
                        ? 'MATCH'
                        : 'DIFF'}
                    </div>
                    <div>
                      rep: {equivalenceReport.structuralRelation.representationA} vs{' '}
                      {equivalenceReport.structuralRelation.representationB}
                    </div>
                  </div>
                </div>

                {/* 2. Logical Class Relation */}
                <div className="bg-[#090d16] border border-slate-800 rounded p-4 flex flex-col gap-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400">
                    2. Logical Class Relation
                  </div>
                  <div className="font-mono text-sm font-semibold text-white">
                    {equivalenceReport.logicalClassRelation.status}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 space-y-1">
                    <div>A: {equivalenceReport.logicalClassRelation.logicalClassIdA}</div>
                    <div>B: {equivalenceReport.logicalClassRelation.logicalClassIdB}</div>
                    <div>
                      shared:{' '}
                      {equivalenceReport.logicalClassRelation.sharedOrganizations.join(', ') ||
                        'none'}
                    </div>
                  </div>
                </div>

                {/* 3. Mathematical Equivalence */}
                <div className="bg-[#090d16] border border-slate-800 rounded p-4 flex flex-col gap-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                    3. Mathematical Equivalence
                  </div>
                  <div
                    className={`font-mono text-sm font-semibold ${
                      equivalenceReport.mathematicalEquivalence.status === 'proven' ||
                      equivalenceReport.mathematicalEquivalence.status === 'numerically_supported'
                        ? 'text-emerald-300'
                        : equivalenceReport.mathematicalEquivalence.status === 'refuted'
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {equivalenceReport.mathematicalEquivalence.status}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    proofMethod:{' '}
                    <span className="text-cyan-300">
                      {equivalenceReport.mathematicalEquivalence.proofMethod}
                    </span>
                  </div>
                  {equivalenceReport.mathematicalEquivalence.validationErrors.length > 0 && (
                    <div className="font-mono text-[11px] text-rose-300 bg-[#070a11] border border-rose-500/30 rounded px-2 py-1">
                      validationErrors:{' '}
                      {equivalenceReport.mathematicalEquivalence.validationErrors.join(', ')}
                    </div>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {equivalenceReport.mathematicalEquivalence.details}
                  </p>
                  {equivalenceReport.mathematicalEquivalence.counterexample && (
                    <div className="font-mono text-[11px] text-rose-300 bg-[#070a11] border border-rose-500/30 rounded p-2">
                      counterexample:{' '}
                      {JSON.stringify(equivalenceReport.mathematicalEquivalence.counterexample)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={handleRunAiCompare}
                  disabled={isComparingAi}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2 cursor-pointer"
                >
                  {isComparingAi ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{t.analyzing}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{t.askAi}</span>
                    </>
                  )}
                </button>
              </div>

              {aiCompareResult && (
                <div className="bg-[#111524] border border-amber-500/40 rounded p-4 text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-amber-300 uppercase">{t.aiBannerTitle}</span>
                    <span className="font-mono text-[11px] text-amber-200">
                      {t.aiUnverifiedTag}
                    </span>
                  </div>
                  {aiCompareResult.error ? (
                    <div className="text-rose-400 font-mono">{aiCompareResult.error}</div>
                  ) : (
                    <div className="text-slate-200 space-y-1.5 leading-relaxed">
                      <div>
                        <strong className="text-slate-400">Structure: </strong>
                        {aiCompareResult.structuralComparison}
                      </div>
                      <div>
                        <strong className="text-slate-400">Logic: </strong>
                        {aiCompareResult.logicalComparison}
                      </div>
                      <div>{aiCompareResult.explanation}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: GEMINI AI AUDITOR WORKBENCH */}
        {activeTab === 'ai' && (
          <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white">{t.aiLabTitle}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t.aiLabDesc}</p>
              </div>
              <span className="font-mono text-xs text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded">
                {t.aiUnverifiedTag}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { label: 'Nested Radical Fraction', f: '\\frac{\\sqrt{a+b}}{\\frac{c+d}{e}}' },
                { label: 'Euler Characteristic', f: 'V - E + F = 2' },
                { label: 'Definite Integral', f: 'int(a,b,f(x),x)' },
                { label: 'Determinant', f: 'det(A)' },
              ].map((item) => (
                <button
                  key={item.f}
                  onClick={() => {
                    setInspectorExpr(item.f);
                    handleRunAiAudit(item.f);
                  }}
                  className="text-left p-3 rounded bg-[#090d16] hover:border-amber-500/50 border border-slate-800 cursor-pointer"
                >
                  <div className="text-xs text-slate-300 font-medium">{item.label}</div>
                  <div className="font-mono text-xs text-cyan-300 mt-1 truncate">{item.f}</div>
                </button>
              ))}
            </div>

            {aiAuditResult && (
              <div className="bg-[#090d16] border border-amber-500/30 rounded p-4 font-mono text-xs space-y-2">
                <div className="text-amber-300 font-semibold">
                  [{aiAuditResult.verificationStatus}] Proposal for: {inspectorExpr}
                </div>
                <pre className="text-slate-300 overflow-auto max-h-[360px]">
                  {JSON.stringify(aiAuditResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SPECIFICATION UMFP 0.1.x */}
        {activeTab === 'spec' && (
          <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-6 flex flex-col gap-6 max-w-4xl">
            <div className="border-b border-slate-800 pb-4">
              <div className="text-xs font-mono text-cyan-400">
                UMFP SPECIFICATION · v0.1.x — Experimental Research Release
              </div>
              <h2 className="text-xl font-semibold text-white mt-1">
                {lang === 'ru'
                  ? 'Универсальный паспорт математической формулы (UMFP 0.1.x — Experimental Research Release)'
                  : 'Universal Mathematical Formula Passport (UMFP 0.1.x — Experimental Research Release)'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300">
              <div className="bg-[#090d16] border border-slate-800 rounded p-4 space-y-2">
                <h3 className="text-sm font-semibold text-cyan-300">
                  {lang === 'ru'
                    ? '1. Ограничение области (ALGEBRA | GEOMETRY | UNKNOWN)'
                    : '1. Domain Scope Restriction (ALGEBRA | GEOMETRY | UNKNOWN)'}
                </h3>
                <p>
                  {lang === 'ru'
                    ? 'В 0.1.x домены ограничены тремя значениями с явным DomainClassification (primaryDomain, confidence, classificationMethod, reasons). Буквы a, b, c, x, y или pi сами по себе не назначают GEOMETRY.'
                    : 'In 0.1.x domains are strictly restricted to ALGEBRA, GEOMETRY, and UNKNOWN with structured DomainClassification provenance. Letters like a,b,c,x,y never falsely infer GEOMETRY.'}
                </p>
              </div>

              <div className="bg-[#090d16] border border-slate-800 rounded p-4 space-y-2">
                <h3 className="text-sm font-semibold text-indigo-300">
                  {lang === 'ru'
                    ? '2. Семантика RADICAL и NumberDomain'
                    : '2. Radical Semantics & NumberDomain'}
                </h3>
                <p>
                  {lang === 'ru'
                    ? 'rawAst сохраняет отличие \\sqrt{x} от \\sqrt[2]{x}, а normalizedAst канонизирует степень 2. Чётный/нечётный/символьный индекс (\\sqrt[3]{x}, \\sqrt[4]{x}, \\sqrt[n]{x}) и невалидные степени (0, -2, 1/2) обрабатываются раздельно в REAL/COMPLEX.'
                    : 'rawAst preserves implicit vs explicit degree while normalizedAst canonicalizes degree 2. Odd, even, symbolic, and invalid degrees follow strict REAL vs COMPLEX domain rules.'}
                </p>
              </div>

              <div className="bg-[#090d16] border border-slate-800 rounded p-4 space-y-2">
                <h3 className="text-sm font-semibold text-emerald-300">
                  {lang === 'ru'
                    ? '3. Честная эквивалентность и proofMethod'
                    : '3. Equivalence Integrity & proofMethod'}
                </h3>
                <p>
                  {lang === 'ru'
                    ? 'Сравнение выполняется по полной строке canonicalExact (хэш используется только как индекс). При validationErrors (например 1/0 vs 1/0) статус равен not_applicable. Числовая проверка детерминирована и отделена от proven через proofMethod.'
                    : 'Equivalence compares full canonicalExact strings (hashes are index-only). Validation errors (e.g. 1/0 vs 1/0) block proven and return not_applicable. Numeric sampling uses proofMethod: numeric_sampling.'}
                </p>
              </div>

              <div className="bg-[#090d16] border border-slate-800 rounded p-4 space-y-2">
                <h3 className="text-sm font-semibold text-amber-300">
                  {lang === 'ru'
                    ? '4. Граница Ядра и Gemini AI'
                    : '4. Deterministic Core vs Gemini AI Boundary'}
                </h3>
                <p>
                  {lang === 'ru'
                    ? 'Математическое ядро umfp-core полностью детерминировано. Gemini AI выступает исключительно в роли исследовательского ассистента: его гипотезы всегда помечены как AI-proposed / unverified.'
                    : 'The umfp-core engine is strictly deterministic. Gemini AI serves solely as an exploratory research assistant whose hypotheses are explicitly marked AI-proposed / unverified.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
