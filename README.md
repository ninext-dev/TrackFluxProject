# TrackFlux Systems - Sistema de Gestão Industrial

![TrackFlux Logo](https://i.imgur.com/Nj5Xyw0.png)

<<<<<<< HEAD
O Track Flux Systems é um sistema SaaS (Software as a Service), desenvolvido para otimizar a gestão industrial. Ele oferece ferramentas para rastreamento de produção, planejamento de necessidades de materiais (MRP), gestão de formulações, planejamento de produção assistido por inteligência artificial e automação de processos industriais.

## Visão Geral do Projeto

Este projeto consiste em uma aplicação web (PWA) e mobile, desenvolvida em React e TypeScript, utilizando Supabase como backend e base de dados, e Tailwind CSS para estilização. Ele integra funcionalidades avançadas de gestão e automação, com destaque para a aplicação de IA (Bolt AI) no planejamento e otimização de processos.
=======
  O Track Flux Systems é um sistema SaaS (Software as a Service), desenvolvido para otimizar a gestão industrial. Ele oferece ferramentas para rastreamento de produção, planejamento de necessidades de materiais (MRP), gestão de formulações, planejamento de produção assistido por inteligência artificial e automação de processos industriais.

## Visão Geral do Projeto

  Este projeto consiste em uma aplicação web (PWA) e mobile, desenvolvida em React e TypeScript, utilizando Supabase como backend e base de dados, e Tailwind CSS para estilização. Ele integra funcionalidades avançadas de gestão e automação, com destaque para a aplicação de IA (Bolt AI) no planejamento e otimização de processos.
>>>>>>> f3c25f347f2c0eac18c1f8649f8aa82078dd8cd4

## Funcionalidades Principais

O TrackFlux oferece uma variedade de módulos para cobrir diversas áreas da gestão industrial:

* **Dashboard Interativo:** Visão geral e métricas de produção, incluindo status de produções, tendências diárias/semanais e distribuição por produto/departamento.
<<<<<<< HEAD
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

=======
<img width="811" height="432" alt="Captura de tela 2025-07-23 144252" src="https://github.com/user-attachments/assets/469bba4d-066b-414a-97f0-80db1330fbbb" />

* **Cadastro de Produtos:** Gerenciamento completo de produtos, incluindo código, nome, marca, tipo (Produto Acabado, Matéria Prima, Embalagem, etc.), unidade de medida e status de atividade. Permite exportação e importação via XLSX.
  
<img width="1001" height="430" alt="image" src="https://github.com/user-attachments/assets/084b949c-adc3-4fae-b1d4-1d9f1e1abfda" />

* **Classificações Dinâmicas:** Gerenciamento de classificações personalizáveis para unidades de medida, departamentos, marcas e tipos de produto.

<img width="808" height="304" alt="Captura de tela 2025-07-23 144202" src="https://github.com/user-attachments/assets/a5efb98f-6ff0-4cd0-afe3-d15cca9f396a" />

* **Gestão de Formulações:** Cadastro e edição de fórmulas de produtos, com itens de receita (matérias-primas, produtos intermediários) e embalagens, incluindo quantidades inteiras e por peso.

<img width="903" height="728" alt="Captura de tela 2025-07-23 100851" src="https://github.com/user-attachments/assets/b016778c-6489-4ab7-b007-ffe4d69f5c77" />

* **Diário de Produção:** Registro e acompanhamento diário das produções, com detalhes de produtos, lotes, quantidades, status (Pendente, Em Produção, Concluído) e divergências.

<img width="1121" height="551" alt="image" src="https://github.com/user-attachments/assets/02a27846-ab70-4c07-8b71-08cd793505ce" />

<img width="1248" height="318" alt="Captura de tela 2025-07-23 101228" src="https://github.com/user-attachments/assets/2cd84056-795d-4b26-9138-5c5c7176b6c6" />

* **Calendário de Produção:** Visualize e gerencie a programação de produção por mês, semana ou dia. Permite reordenar a prioridade das produções no dia via drag-and-drop e também alterar andamento.

<img width="1232" height="812" alt="Captura de tela 2025-07-23 101349" src="https://github.com/user-attachments/assets/5847f2d7-4fb9-4119-bf7d-a3112317e772" />

* **Relatórios de Produção:** Relatórios detalhados de programação, agrupados por status e departamento, com opção de exportação para XLSX.

<img width="1231" height="869" alt="Captura de tela 2025-07-23 101837" src="https://github.com/user-attachments/assets/13675d63-aeb8-4ebb-a3b4-1b1a2c3d3ee4" />

* **Separação de Materiais:** Calcula as quantidades totais de matérias-primas e embalagens necessárias para as produções pendentes e em andamento, facilitando a contagem de materiais.

<img width="1245" height="400" alt="Captura de tela 2025-07-23 111036" src="https://github.com/user-attachments/assets/2096e8d4-7c5b-4195-a1ba-00fa4bc697fc" />

* **Tech Planning (Planejamento de Produção PCP):** Módulo para importação de planilhas (VCP, estoque de MP e PA) para acionar um processo de planejamento inteligente (via n8n), que gera um plano de produção. Os resultados podem ser aprovados e importados como produções no sistema. (Sistema ainda em desenvolvimento)
* **Gestão de Produção Gráfica:** Módulo dedicado para controle de produções da gráfica, com rastreamento de tintas e filmes utilizados, cálculo de custos (CMV, mão de obra, tributos) e status de faturamento (com número de nota fiscal).
  
<img width="1276" height="449" alt="Captura de tela 2025-07-23 145659" src="https://github.com/user-attachments/assets/a3e4b8d6-f66e-4d46-8ff0-7a11385f6740" />

* **Relatórios da Gráfica:** Relatórios financeiros e de produção específicos para a área da gráfica, incluindo faturamento diário e distribuição de produtos.
  
<img width="950" height="462" alt="image" src="https://github.com/user-attachments/assets/663811ed-85f6-49d4-9196-c3d29617ee5b" />

* **Gestão de Usuários e Permissões:** Controle de acesso com diferentes classes de usuário (Administrador, Staff, Usuário) e permissões granulares por módulo. Funcionalidade de banimento e exclusão de usuários.

<img width="929" height="225" alt="image" src="https://github.com/user-attachments/assets/6bc699db-33f8-481a-914d-451dda65af24" />

* **Perfis de Usuário:** Usuários podem gerenciar suas informações pessoais e alterar senhas.

<img width="791" height="749" alt="Captura de tela 2025-07-23 142314" src="https://github.com/user-attachments/assets/3ca7dcbb-4737-402d-9153-4a624b3f8548" />

* **Seleção de Ambiente de Banco de Dados:** Permite alternar entre ambientes de produção e teste (Reforpan/Teste).

<img width="575" height="809" alt="Captura de tela 2025-07-23 142427" src="https://github.com/user-attachments/assets/a925de8b-7b6e-4f21-94d3-a4236c1f215a" />



>>>>>>> f3c25f347f2c0eac18c1f8649f8aa82078dd8cd4
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

<<<<<<< HEAD
* ## Contribuições

Este repositório é disponibilizado unicamente para fins de análise de código. Devido à presença de dados sensíveis e segredos industriais (receitas de produtos) na base de dados conectada, contribuições diretas ao código ou à estrutura do projeto não são permitidas.
=======
  * ## Contribuições
  Este repositório é disponibilizado unicamente para fins de análise de código. Devido à presença de dados sensíveis e segredos industriais (receitas de produtos) na base de dados conectada, contribuições diretas ao código ou à estrutura do projeto não são permitidas.
>>>>>>> f3c25f347f2c0eac18c1f8649f8aa82078dd8cd4

Se você encontrar bugs, tiver sugestões ou quiser discutir funcionalidades, por favor, faça contato pelos meios abaixo.


* ## Contato
<<<<<<< HEAD
Gustavo Henrique Oliveira de Almeides

LinkedIn: https://www.linkedin.com/in/gustavo-henrique-oliveira-de-almeides-0a6761234/

GitHub: https://github.com/ninext-dev
=======
Gustavo Henrique Oliveira de Almeides 
[LinkedIn](https://www.linkedin.com/in/gustavo-henrique-oliveira-de-almeides-0a6761234/)

Matheus Andrade 
[LinkedIn](https://www.linkedin.com/in/-matheusviana-)
[GitHub](https://github.com/mvandrade-tech/)
>>>>>>> f3c25f347f2c0eac18c1f8649f8aa82078dd8cd4
