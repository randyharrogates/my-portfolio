/** @format */

import type { PortfolioData, TechItem } from "./portfolio-types.ts";

export const portfolioData: PortfolioData = {
  identity: {
    name: "Randy Chan",
    role: "GenAI Solutions Engineer",
    yoe: 7,
    location: "Singapore",
    status: "available",
    belief: "I believe AI is the future of software development.",
    quote:
      "Jack of all trades, master of none, but often times better than a master of one.",
    badge: "Claude Code Enthusiast",
  },

  techStack: [
    { id: "langgraph", name: "LangGraph", category: "ai-ml", color: "purple", proficiency: 5, years: 3 },
    { id: "langchain", name: "LangChain", category: "ai-ml", color: "green", proficiency: 5, years: 3 },
    { id: "openai", name: "OpenAI API", category: "ai-ml", color: "orange", proficiency: 5, years: 4 },
    { id: "anthropic", name: "Anthropic API", category: "ai-ml", color: "blue", proficiency: 5, years: 2 },
    { id: "pytorch", name: "PyTorch", category: "ai-ml", color: "purple", proficiency: 4, years: 5 },
    { id: "python", name: "Python", category: "lang", color: "green", proficiency: 5, years: 7 },
    { id: "fastapi", name: "FastAPI", category: "lang", color: "orange", proficiency: 5, years: 4 },
    { id: "aws", name: "AWS", category: "cloud", color: "blue", proficiency: 5, years: 6 },
    { id: "azure", name: "Azure", category: "cloud", color: "purple", proficiency: 4, years: 4 },
    { id: "docker", name: "Docker", category: "infra", color: "green", proficiency: 5, years: 6 },
    { id: "k8s", name: "Kubernetes", category: "infra", color: "orange", proficiency: 4, years: 4 },
    { id: "terraform", name: "Terraform", category: "infra", color: "blue", proficiency: 4, years: 4 },
    { id: "mongodb", name: "MongoDB", category: "data", color: "purple", proficiency: 4, years: 5 },
    { id: "postgres", name: "PostgreSQL", category: "data", color: "green", proficiency: 4, years: 6 },
    { id: "pinecone", name: "Pinecone", category: "data", color: "orange", proficiency: 4, years: 2 },
    { id: "weaviate", name: "Weaviate", category: "data", color: "blue", proficiency: 3, years: 2 },
    { id: "redis", name: "Redis", category: "data", color: "purple", proficiency: 4, years: 5 },
    { id: "azservicebus", name: "Azure Service Bus", category: "cloud", color: "green", proficiency: 3, years: 3 },
    { id: "typescript", name: "TypeScript", category: "lang", color: "orange", proficiency: 4, years: 5 },
    { id: "react", name: "React", category: "lang", color: "blue", proficiency: 4, years: 5 },
  ],

  techEdges: [
    { a: "langgraph", b: "langchain", projectIds: ["multi-agent-rag", "credit-memo", "kyb"] },
    { a: "langchain", b: "openai", projectIds: ["multi-agent-rag", "kyb", "ecommerce"] },
    { a: "langchain", b: "anthropic", projectIds: ["multi-agent-rag", "credit-memo"] },
    { a: "langgraph", b: "openai", projectIds: ["multi-agent-rag", "credit-memo"] },
    { a: "langgraph", b: "anthropic", projectIds: ["multi-agent-rag", "credit-memo"] },
    { a: "openai", b: "fastapi", projectIds: ["ecommerce", "speech-to-text", "kyb"] },
    { a: "anthropic", b: "fastapi", projectIds: ["credit-memo"] },
    { a: "fastapi", b: "python", projectIds: ["multi-agent-rag", "kyb", "ecommerce", "speech-to-text", "credit-memo"] },
    { a: "pytorch", b: "python", projectIds: ["fine-tuning", "speech-to-text"] },
    { a: "pytorch", b: "openai", projectIds: ["fine-tuning"] },
    { a: "aws", b: "terraform", projectIds: ["multi-agent-rag", "ecommerce", "speech-to-text"] },
    { a: "aws", b: "docker", projectIds: ["multi-agent-rag", "ecommerce", "speech-to-text", "credit-memo"] },
    { a: "aws", b: "k8s", projectIds: ["multi-agent-rag", "ecommerce"] },
    { a: "azure", b: "terraform", projectIds: ["kyb", "credit-memo"] },
    { a: "azure", b: "docker", projectIds: ["kyb", "credit-memo", "hrm"] },
    { a: "azure", b: "k8s", projectIds: ["kyb", "credit-memo"] },
    { a: "azure", b: "azservicebus", projectIds: ["kyb", "credit-memo", "hrm"] },
    { a: "k8s", b: "docker", projectIds: ["multi-agent-rag", "ecommerce", "kyb", "credit-memo"] },
    { a: "k8s", b: "terraform", projectIds: ["multi-agent-rag", "ecommerce", "kyb"] },
    { a: "mongodb", b: "fastapi", projectIds: ["ecommerce", "holiday-booking"] },
    { a: "postgres", b: "fastapi", projectIds: ["kyb", "credit-memo", "hrm"] },
    { a: "pinecone", b: "langchain", projectIds: ["multi-agent-rag", "credit-memo"] },
    { a: "pinecone", b: "openai", projectIds: ["multi-agent-rag", "credit-memo"] },
    { a: "weaviate", b: "langchain", projectIds: ["kyb"] },
    { a: "redis", b: "fastapi", projectIds: ["ecommerce", "credit-memo", "kyb"] },
    { a: "redis", b: "langchain", projectIds: ["credit-memo", "kyb"] },
    { a: "react", b: "typescript", projectIds: ["portfolio", "ecommerce", "holiday-booking", "hrm"] },
    { a: "typescript", b: "fastapi", projectIds: ["ecommerce", "holiday-booking", "hrm"] },
  ],

  roles: [
    { id: "role-genai-se", title: "GenAI Solutions Engineer", startYear: 2023, endYear: null, scope: 5, domId: "role-genai-se" },
    { id: "role-ai-eng", title: "AI Engineer (Healthcare)", startYear: 2021, endYear: 2023, scope: 4, domId: "role-ai-eng" },
    { id: "role-ml-eng", title: "ML Engineer (FinServ)", startYear: 2019, endYear: 2021, scope: 3, domId: "role-ml-eng" },
    { id: "role-swe", title: "Software Engineer", startYear: 2018, endYear: 2019, scope: 2, domId: "role-swe" },
  ],

  certifications: [
    { id: "cert-caie", short: "CAIE", full: "CAIE (AIP)", domId: "cert-caie" },
    { id: "cert-ecba", short: "ECBA", full: "ECBA (IIBA)", domId: "cert-ecba" },
  ],

  education: [
    { id: "edu-bsc-ict", degree: "B.Sc Information and Communication Technology" },
  ],

  interests: ["Multi-Agent orchestration", "Agentic governance", "Enterprise RAG"],
  aiTools: ["Claude Code", "Cursor", "AI-assisted workflows"],

  socials: {
    email: "randychan_92@outlook.com",
    github: "https://github.com/randyharrogates",
    linkedin: "https://www.linkedin.com/in/randychan112",
  },
};

export function topNByProficiency(stack: TechItem[], n: number): TechItem[] {
  return [...stack].sort((a, b) => b.proficiency - a.proficiency).slice(0, n);
}

export function deterministicHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
