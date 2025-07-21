# TrackFlux Systems - Sistema de Gestão Industrial

![TrackFlux Logo](https://i.imgur.com/Nj5Xyw0.png)

O Track Flux Systems é um sistema SaaS (Software as a Service), desenvolvido para otimizar a gestão industrial. Ele oferece ferramentas para rastreamento de produção, planejamento de necessidades de materiais (MRP), gestão de formulações, planejamento de produção assistido por inteligência artificial e automação de processos industriais.

## Visão Geral do Projeto

Este projeto consiste em uma aplicação web (PWA) e mobile, desenvolvida em React e TypeScript, utilizando Supabase como backend e base de dados, e Tailwind CSS para estilização. Ele integra funcionalidades avançadas de gestão e automação, com destaque para a aplicação de IA (Bolt AI) no planejamento e otimização de processos.

## Funcionalidades Principais

O TrackFlux oferece uma variedade de módulos para cobrir diversas áreas da gestão industrial:

* **Dashboard Interativo:** Visão geral e métricas de produção, incluindo status de produções, tendências diárias/semanais e distribuição por produto/departamento.
* **Cadastro de Produtos:** Gerenciamento completo de produtos, incluindo código, nome, marca, tipo (Produto Acabado, Matéria Prima, Embalagem, etc.), unidade de medida e status de atividade. Permite exportação e importação via XLSX.
* **Classificações Dinâmicas:** Gerenciamento de classificações personalizáveis para unidades de medida, departamentos, marcas e tipos de produto. 
* **Gestão de Formulações:** Cadastro e edição de fórmulas de produtos, com itens de receita (matérias-primas, produtos intermediários) e embalagens, incluindo quantidades inteiras e por peso. Suporta reordenação de itens por arrastar e soltar.
* **Diário de Produção:** Registro e acompanhamento diário das produções, com detalhes de produtos, lotes, quantidades, status (Pendente, Em Produção, Concluído) e divergências.
* **Calendário de Produção:** Visualize e gerencie a programação de produção por mês, semana ou dia. Permite reordenar a prioridade das produções no dia via drag-and-drop e também alterar andamento.
* **Relatórios de Produção:** Relatórios detalhados de programação, agrupados por status e departamento, com opção de exportação para XLSX.
* **Separação de Materiais:** Calcula as quantidades totais de matérias-primas e embalagens necessárias para as produções pendentes e em andamento, facilitando a contagem de materiais.
* **Tech Planning (Planejamento de Produção PCP):** Módulo para importação de planilhas (VCP, estoque de MP e PA) para acionar um processo de planejamento inteligente (via n8n), que gera um plano de produção. Os resultados podem ser aprovados e importados como produções no sistema.
* **Gestão de Produção Gráfica:** Módulo dedicado para controle de produções da gráfica, com rastreamento de tintas e filmes utilizados, cálculo de custos (CMV, mão de obra, tributos) e status de faturamento (com número de nota fiscal).
* **Relatórios da Gráfica:** Relatórios financeiros e de produção específicos para a área gráfica, incluindo faturamento diário e distribuição de produtos.
* **Gestão de Usuários e Permissões:** Controle de acesso com diferentes classes de usuário (Administrador, Staff, Usuário) e permissões granulares por módulo. Funcionalidade de banimento e exclusão de usuários.
* **Perfis de Usuário:** Usuários podem gerenciar suas informações pessoais e alterar senhas.
* **Seleção de Ambiente de Banco de Dados:** Permite alternar entre ambientes de produção e teste (Reforpan/Teste).

## Tecnologias Utilizadas

* **Frontend:**
    * [React](https://react.dev/)
    * [TypeScript](https://www.typescriptlang.org/)
    * [Vite](https://vitejs.dev/)
    * [Tailwind CSS](https://tailwindcss.com/)
    * [Lucide React](https://lucide.dev/) (ícones)
    * [date-fns](https://date-fns.org/) (manipulação de datas)
    * [recharts](https://recharts.org/) (gráficos e relatórios)
    * [@dnd-kit](https://dndkit.com/) (funcionalidade de arrastar e soltar)
    * [xlsx](https://sheetjs.com/excel) (leitura e escrita de arquivos Excel)
* **Backend & Banco de Dados:**
    * [Supabase](https://supabase.com/) (PostgreSQL, Autenticação, Storage, Realtime, Functions)
        * Utilização extensiva de Row Level Security (RLS) para segurança dos dados.
        * Triggers de banco de dados para `updated_at`.
* **Automação/Integração (Tech Planning):**
    * [n8n](https://n8n.io/) (via webhooks para orquestração de fluxos de trabalho de planejamento com IA/Bolt AI)

### Pré-requisitos

* [Node.js](https://nodejs.org/en/) (versão 18 ou superior)
* [npm](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)
* [Git](https://git-scm.com/)

* ## Contribuições

Este repositório é disponibilizado unicamente para fins de análise de código. Devido à presença de dados sensíveis e segredos industriais (receitas de produtos) na base de dados conectada, contribuições diretas ao código ou à estrutura do projeto não são permitidas.

Se você encontrar bugs, tiver sugestões ou quiser discutir funcionalidades, por favor, faça contato pelos meios abaixo.


* ## Contato
Gustavo Henrique Oliveira de Almeides

LinkedIn: https://www.linkedin.com/in/gustavo-henrique-oliveira-de-almeides-0a6761234/

GitHub: https://github.com/ninext-dev
