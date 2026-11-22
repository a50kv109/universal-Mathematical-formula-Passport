/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_MODEL = 'gemini-4-hydrogen';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Exploratory AI semantic interpretation & critique (strictly AI-proposed / unverified)
  app.post('/api/umfp/audit', async (req, res) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured. Deterministic UMFP core endpoints and UI continue to work locally.',
        });
      }
      const { formula, description, domain, deterministicSummary } = req.body;
      if (!formula) {
        return res.status(400).json({ error: 'Formula is required' });
      }

      const prompt = `You are a mathematical research assistant supporting the UMFP 0.1.x (Universal Mathematical Formula Passport) laboratory.
Important architectural rule: The deterministic mathematical core already computes AST, Structural Construct counts, Structural ID, and domain constraints.
Your role is ONLY to propose exploratory semantic interpretations, variable roles, invariant hypotheses, and research critiques.
Do NOT claim formal mathematical proof.

Formula: ${formula}
Domain Hint: ${domain || 'General Mathematics'}
Context: ${description || 'None'}
Deterministic Core Summary: ${deterministicSummary ? JSON.stringify(deterministicSummary) : 'Not provided'}

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "aiProposed": true,
  "verificationStatus": "unverified",
  "proposedDomain": "ALGEBRA | GEOMETRY | UNKNOWN",
  "proposedLogicalClass": "Concise hypothesis for logical organization",
  "mathematicalObject": "equation | identity | expression | system | theorem",
  "semantics": {
    "entities": ["semantic role descriptions of variables/constructs"],
    "relation": "verbal explanation of the mathematical relationship"
  },
  "proposedInvariants": ["candidate invariant properties to investigate"],
  "equivalentFormHints": ["candidate equivalent forms (unverified hypotheses)"],
  "aiCritique": "Analytical commentary on the compositional structure, fraction/construct roles, and logical classification."
}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({
        ...parsed,
        aiProposed: true,
        verificationStatus: 'unverified',
      });
    } catch (error: any) {
      console.error('UMFP AI Audit Error:', error);
      res.status(500).json({ error: error.message || 'Failed to audit formula with Gemini AI' });
    }
  });

  // Exploratory AI comparison commentary (complementing deterministic comparator)
  app.post('/api/umfp/compare', async (req, res) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured. Deterministic UMFP core endpoints and UI continue to work locally.',
        });
      }
      const { formulaA, formulaB, deterministicComparison } = req.body;
      if (!formulaA || !formulaB) {
        return res.status(400).json({ error: 'Both formulaA and formulaB are required' });
      }

      const prompt = `You are a mathematical research assistant supporting UMFP 0.1.x comparison.
The deterministic core already evaluated structural relation, logical class relation, and numeric/canonical equivalence.
Provide a concise exploratory explanation of the structural vs logical relationship between these two formulas. Do NOT overrule the deterministic equivalence status.

Formula A: ${formulaA}
Formula B: ${formulaB}
Deterministic Report: ${deterministicComparison ? JSON.stringify(deterministicComparison) : 'Not provided'}

Return ONLY valid JSON (no markdown fences):
{
  "aiProposed": true,
  "verificationStatus": "unverified",
  "structuralComparison": "concise comparison of compositional structure and notation",
  "logicalComparison": "concise comparison of logical organization",
  "explanation": "research commentary on why they share or diverge in structure, logical class, and domain constraints"
}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({
        ...parsed,
        aiProposed: true,
        verificationStatus: 'unverified',
      });
    } catch (error: any) {
      console.error('UMFP Compare Error:', error);
      res.status(500).json({ error: error.message || 'Comparison failed' });
    }
  });

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.argv.includes('--prod') ||
    process.env.npm_lifecycle_event === 'start';

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.resolve(distDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
      throw new Error('Production build not found at dist/index.html. Run "npm run build" before "npm start".');
    }
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(indexHtmlPath);
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    const mode = isProduction ? 'production (dist)' : 'development (vite middleware)';
    console.log(`UMFP Lab server running in ${mode} mode on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
