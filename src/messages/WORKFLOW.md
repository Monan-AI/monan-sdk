# 🔀 Workflow Orchestration

O `Workflow` é um orquestrador de processos sequenciais que permite encadear múltiplos agentes e roteadores em uma pipeline automática. Perfeito para cenários complexos que requerem múltiplas etapas de processamento.

## Características Principais

✅ **Encadeamento Sequencial**: Adicione agentes/roteadores na ordem desejada  
✅ **Method Chaining**: Interface fluente com `.add()` e `.build()`  
✅ **Dual Patterns**: Suporte para `invoke()` (síncrono) e `stream()` (assíncrono)  
✅ **Event Streaming**: Capture mensagens de todos os processos ou apenas do final  
✅ **Composição Flexível**: Combine `Agent` e `Router` no mesmo workflow  

---

## Instalação & Uso Básico

```typescript
import { Agent, Workflow, HumanMessage } from 'monan';

// 1. Crie seus agentes
const researcher = new Agent({
  name: "Researcher",
  model: "qwen2.5:7b",
  description: "Pesquisa tópicos de forma aprofundada"
});

const writer = new Agent({
  name: "Writer",
  model: "qwen2.5:7b",
  description: "Escreve conteúdo claro e envolvente"
});

// 2. Monte o workflow
const workflow = new Workflow()
  .add(researcher)
  .add(writer)
  .build();

// 3. Execute
const result = await workflow.invoke([
  new HumanMessage("Escreva sobre inteligência artificial")
]);

console.log(result.content); // Apenas o output final do writer
```

---

## API Reference

### Constructor

```typescript
new Workflow(options?: { streamEvents?: boolean })
```

- **streamEvents** (default: `false`): Se `true`, retorna mensagens de todos os processos

### Métodos

#### `.add(process: Agent | Router): Workflow`
Adiciona um agente ou roteador à fila do workflow.

```typescript
workflow
  .add(agent1)
  .add(router1)
  .add(agent2);
```

#### `.build(): Workflow`
Finaliza a configuração do workflow. Deve ser chamado após adicionar todos os processos.

```typescript
workflow.build();
```

#### `.invoke(messages: Message[], streamEvents?: boolean): Promise<ChatResponse>`
Executa todos os processos sequencialmente.

**Parâmetros:**
- `messages`: Array de mensagens iniciais
- `streamEvents` (opcional): Override para este invocation

**Retorno:**
- Se `streamEvents=false`: `{ content: string, usage: {...} }`
- Se `streamEvents=true`: `{ content: string, usage: {...}, processMessages: ChatResponse[] }`

```typescript
// Sem eventos
const result = await workflow.invoke([new HumanMessage("Hello")]);
console.log(result.content); // String

// Com eventos
const result = await workflow.invoke([new HumanMessage("Hello")], true);
result.processMessages?.forEach((msg, i) => {
  console.log(`Process ${i}: ${msg.content}`);
});
```

#### `.stream(messages: Message[], streamEvents?: boolean): AsyncGenerator<string>`
Executa com streaming de tokens.

```typescript
// Sem eventos: apenas o processo final é streamado
for await (const chunk of workflow.stream([new HumanMessage("Hello")])) {
  process.stdout.write(chunk);
}

// Com eventos: todos os processos são streamados
for await (const chunk of workflow.stream([new HumanMessage("Hello")], true)) {
  process.stdout.write(chunk);
}
```

#### `.getProcesses(): Array<Agent | Router>`
Retorna array com todos os processos.

#### `.processCount(): number`
Retorna o número de processos.

#### `.setStreamEvents(enabled: boolean): Workflow`
Define o flag `streamEvents` padrão.

#### `.clear(): Workflow`
Remove todos os processos do workflow.

---

## Exemplos Práticos

### 1️⃣ Pipeline Simples (Pesquisa → Escrita → Edição)

```typescript
const researcher = new Agent({
  name: "Researcher",
  model: "qwen2.5:7b",
  description: "Pesquisa detalhada"
});

const writer = new Agent({
  name: "Writer",
  model: "qwen2.5:7b",
  description: "Escreve conteúdo"
});

const editor = new Agent({
  name: "Editor",
  model: "qwen2.5:7b",
  description: "Edita para qualidade"
});

// Pipeline automática
const contentPipeline = new Workflow()
  .add(researcher)
  .add(writer)
  .add(editor)
  .build();

const result = await contentPipeline.invoke([
  new HumanMessage("Escreva um artigo sobre TypeScript")
]);

console.log("Conteúdo Final:", result.content);
```

### 2️⃣ Capturando Todas as Etapas

```typescript
const workflow = new Workflow({ streamEvents: true })
  .add(analyzer)
  .add(optimizer)
  .add(formatter)
  .build();

const result = await workflow.invoke([
  new HumanMessage("Otimize este código")
]);

// Agora temos a saída de cada etapa
if (result.processMessages) {
  result.processMessages.forEach((msg, i) => {
    console.log(`\n--- Step ${i + 1} ---`);
    console.log(msg.content);
  });
}
```

### 3️⃣ Streaming com Eventos de Todos os Processos

```typescript
const workflow = new Workflow({ streamEvents: true })
  .add(brainstorm)
  .add(outline)
  .add(write)
  .build();

console.log("Geração de conteúdo em tempo real:\n");

for await (const chunk of workflow.stream([
  new HumanMessage("Crie uma história de ficção científica")
])) {
  process.stdout.write(chunk);
}
```

### 4️⃣ Combinando com Router

```typescript
import { Router } from 'monan';

const fastAgent = new Agent({ name: "Fast", model: "gemma3:4b" });
const smartAgent = new Agent({ name: "Smart", model: "openai/gpt-5.2-pro" });

const router = new Router({
  model: "router:custom",
  default: fastAgent,
  routes: [
    { intent: "complex", description: "Tarefas complexas", agent: smartAgent },
    { intent: "simple", description: "Tarefas simples", agent: fastAgent }
  ]
});

// Combine Router com Agents no workflow
const workflow = new Workflow()
  .add(router)           // Router seleciona melhor agente
  .add(reviewer)         // Revisa resultado
  .build();

const result = await workflow.invoke([
  new HumanMessage("Resolva este problema")
]);
```

### 5️⃣ Override de Stream Events por Chamada

```typescript
const workflow = new Workflow({ streamEvents: false })
  .add(step1)
  .add(step2)
  .build();

// Uso normal: apenas resultado final
let result = await workflow.invoke([new HumanMessage("test")]);

// Para este call, desejo ver todos os eventos
result = await workflow.invoke(
  [new HumanMessage("test")],
  true // Override para true
);

console.log(result.processMessages?.length); // Ambos os processos
```

---

## Fluxo de Execução

### Invoke Pattern
```
Mensagens Iniciais
        ↓
   Process 1 (Agent/Router)
        ↓ (mensagem adicionada ao histórico)
   Process 2 (Agent/Router)
        ↓ (mensagem adicionada ao histórico)
   Process N (Agent/Router)
        ↓
   Retorna: { content, usage, processMessages? }
```

### Stream Pattern
```
Mensagens Iniciais
        ↓
   Process 1 → [chunks] (se streamEvents=true)
        ↓
   Process 2 → [chunks] (sempre que for o último)
        ↓
   Process N → [chunks] (sempre)
        ↓
   Yield de chunks em tempo real
```

---

## Padrões de Uso

### ✅ Boas Práticas

```typescript
// ✅ Use method chaining para construção legível
const workflow = new Workflow()
  .add(analyzeInput)
  .add(processData)
  .add(formatOutput)
  .build();

// ✅ Especifique nomes descritivos para agentes
const analyzer = new Agent({
  name: "InputAnalyzer",
  description: "Analisa e valida dados de entrada"
});

// ✅ Use streamEvents quando precisar auditoria
const auditedWorkflow = new Workflow({ streamEvents: true })
  .add(step1)
  .add(step2);

// ✅ Trate erros apropriadamente
try {
  const result = await workflow.invoke(messages);
} catch (error) {
  console.error(`Workflow falhou: ${error.message}`);
}
```

### ❌ Evite

```typescript
// ❌ Não adicione processos após build sem reconstruir
workflow.build();
workflow.add(anotherAgent); // Não funciona como esperado

// ❌ Não deixe workflows vazios
const emptyWorkflow = new Workflow().build();
// Resultará em warning

// ❌ Não confunda streamEvents: false com falta de resposta
// streamEvents: false = apenas resultado final (esperado)
```

---

## Tratamento de Erros

```typescript
try {
  const result = await workflow.invoke([
    new HumanMessage("Your query")
  ]);
} catch (error) {
  if (error.message.includes("process")) {
    console.error(`Falha em processo específico: ${error.message}`);
    // O erro inclui o número do processo que falhou
  }
}
```

Exemplo de erro:
```
Workflow failed at process 2: Model not found or connection timeout
```

---

## Performance

- **Executão Sequencial**: Cada processo aguarda o anterior completar
- **Histórico de Mensagens**: Cresce com cada processo (considere em workflows longos)
- **Streaming Eficiente**: Não carrega resposta inteira em memória com `.stream()`

---

## Casos de Uso

🎯 **Content Creation Pipeline**
- Pesquisa → Escrita → Edição → Publicação

🎯 **Code Review Workflow**
- Análise → Refatoração → Testes → Aprovação

🎯 **Data Processing**
- Extração → Limpeza → Análise → Visualização

🎯 **Multi-Stage Reasoning**
- Decomposição → Análise → Síntese → Validação

---

## Próximas Adições

- Execução paralela de processos (quando viável)
- Condicionalidades entre processos
- Retry automático com backoff
- Persistência de estado do workflow
