import { QuestionItem } from '../types/game';

export interface Mission {
  id: string;
  title: string;
  place: string;
  description: string;
  color: string;
  icon: 'water' | 'market' | 'signal';
  outcome: string;
  questions: QuestionItem[];
}

function item(id: string, category: QuestionItem['category'], skill: string, context: string, prompt: string, options: QuestionItem['options'], correctIndex: QuestionItem['correctIndex'], explanation: string, transfer = false): QuestionItem {
  return { id, category, skill, difficulty: transfer ? 2 : 1, context, prompt, options, correctIndex, explanation, transfer };
}

export const MISSIONS: Mission[] = [
  {
    id: 'water', title: 'Cada gota conta', place: 'Pátio da escola', icon: 'water', color: '#55d8e8',
    description: 'Investigue um desperdício, confira as contas e escolha o que fazer com a turma.',
    outcome: 'Você investigou o desperdício e escolheu uma ação apoiada em medições.',
    questions: [
      item('water_1', 'words', 'Leitura de dados', 'Situação simulada: a turma mediu o consumo da escola. Segunda: 600 L. Terça: 450 L. O número de pessoas foi o mesmo.', 'Qual afirmação os dados permitem fazer?', ['Na terça, o consumo foi 150 L menor.', 'Na terça, ninguém usou água.', 'A escola economizou 50%.', 'A diferença foi de 450 L.'], 0, '600 − 450 = 150 litros. Os dados mostram a diferença; ainda não mostram a causa.'),
      item('water_2', 'math', 'Porcentagem', 'A escola passou de 600 L para 450 L. A redução foi de 150 L.', 'A redução corresponde a qual parte dos 600 L iniciais?', ['10%', '15%', '25%', '50%'], 2, '150 ÷ 600 = 0,25. Multiplicando por 100, a redução é de 25%.'),
      item('water_3', 'logic', 'Evidências', 'Um colega disse: “O consumo caiu porque trocamos os cartazes”. A turma também consertou uma torneira naquele dia.', 'Qual é a conclusão mais cuidadosa?', ['O cartaz foi a única causa.', 'A torneira não fez diferença.', 'Não precisamos medir mais.', 'Precisamos investigar o efeito de cada mudança.'], 3, 'Duas mudanças aconteceram juntas. A queda no consumo não prova, sozinha, qual foi responsável por ela.'),
      item('water_4', 'math', 'Unidades de medida', 'Uma torneira perde 250 mL por minuto. Nesta atividade, considere que o vazamento mantém esse ritmo.', 'Quantos litros ela perde em uma hora?', ['15 L', '250 L', '1,5 L', '60 L'], 0, '250 × 60 = 15.000 mL. Como 1.000 mL equivalem a 1 L, são 15 litros.'),
      item('water_5', 'words', 'Comunicação clara', 'A turma vai avisar à direção o que encontrou.', 'Qual recado ajuda mais a decidir uma ação?', ['“Tudo está um caos.”', '“Medimos 250 mL por minuto na torneira do pátio; pedimos o reparo.”', '“Alguém deve resolver alguma coisa.”', '“Com certeza, todas as torneiras estão quebradas.”'], 1, 'O recado indica local, medição e ação solicitada. Evita generalizar além do que foi observado.'),
      item('water_6', 'logic', 'Comparação justa', 'Depois do reparo, a turma quer avaliar a mudança no consumo.', 'Como tornar a comparação mais útil?', ['Comparar um dia de aula com um feriado.', 'Usar só o dia de menor consumo.', 'Medir dias com condições parecidas e anotar diferenças.', 'Ignorar quantas pessoas estavam na escola.'], 2, 'Dias comparáveis e registros de mudanças ajudam a interpretar os resultados sem atribuir tudo ao reparo.'),
      item('water_7', 'math', 'Porcentagem', 'Agora é outra situação: uma biblioteca reduziu o consumo de 800 L para 600 L.', 'Qual foi a redução percentual?', ['20%', '25%', '30%', '75%'], 1, 'A diferença é 200 L. 200 ÷ 800 = 0,25 = 25%. A mesma ideia funciona com outros valores.', true),
      item('water_8', 'logic', 'Evidências', 'Uma horta cresceu mais depois de receber adubo e mais horas de luz ao mesmo tempo.', 'Podemos afirmar que apenas o adubo causou a diferença?', ['Sim, porque foi usado adubo.', 'Sim, porque a luz nunca interfere.', 'Não; mais de uma condição mudou.', 'Não é possível observar crescimento.'], 2, 'Assim como no consumo de água, duas mudanças simultâneas impedem atribuir o resultado a apenas uma delas.', true),
    ],
  },
  {
    id: 'market', title: 'Uma feira, muitas escolhas', place: 'Feira da turma', icon: 'market', color: '#f5c568',
    description: 'Faça a feira caber no orçamento, sem confundir preço, custo e resultado.',
    outcome: 'Você organizou uma decisão de compra e diferenciou receita de resultado.',
    questions: [
      item('market_1', 'math', 'Orçamento', 'Situação simulada: a turma tem R$ 120. Ingredientes custam R$ 75; embalagens, R$ 25.', 'Quanto sobra para outros gastos?', ['R$ 10', 'R$ 20', 'R$ 45', 'R$ 100'], 1, '75 + 25 = 100. Subtraindo do orçamento: 120 − 100 = R$ 20.'),
      item('market_2', 'math', 'Preço por unidade', 'Uma caixa com 12 sucos custa R$ 36. Outra, com 8 sucos iguais, custa R$ 28.', 'Qual opção tem o menor preço por suco?', ['A caixa de 12: R$ 3 por suco.', 'A caixa de 8: R$ 2 por suco.', 'As duas: R$ 3,50 por suco.', 'Não é possível dividir o preço.'], 0, '36 ÷ 12 = R$ 3. 28 ÷ 8 = R$ 3,50. Preço total e preço por unidade respondem perguntas diferentes.'),
      item('market_3', 'words', 'Interpretação', 'Um anúncio diz: “Até 50% de desconto em produtos selecionados”.', 'O que o anúncio realmente promete?', ['Tudo custa metade.', 'Todo produto tem 50% de desconto.', 'Alguns produtos podem ter desconto de até 50%.', 'A compra inteira será gratuita.'], 2, '“Até” indica um limite, e “selecionados” restringe a quais produtos a oferta se aplica.'),
      item('market_4', 'math', 'Receita e custo', 'A turma vendeu R$ 180 e gastou R$ 100 para preparar os produtos.', 'Qual foi o resultado depois de descontar os custos?', ['R$ 280', 'R$ 180', 'R$ 100', 'R$ 80'], 3, '180 − 100 = R$ 80. O total vendido é a receita; não é todo o valor que sobra.'),
      item('market_5', 'logic', 'Planejamento', 'Há 20 copos disponíveis e 30 visitantes previstos. Cada visitante pode pedir um suco.', 'Qual problema precisa ser considerado?', ['Os copos podem faltar.', 'Sobrarão exatamente 10 copos.', 'Nenhum visitante vai querer suco.', 'Preço baixo cria mais copos.'], 0, 'A quantidade disponível é menor que a demanda prevista. A previsão não garante o consumo, mas permite planejar.'),
      item('market_6', 'words', 'Comunicação clara', 'A equipe precisa combinar o trabalho antes de começar.', 'Qual instrução é mais fácil de executar?', ['“Organizem tudo direito.”', '“Joana conta os copos até as 9h; Caio confere os preços.”', '“Cada um faz o que achar.”', '“Alguém vê isso depois.”'], 1, 'A instrução define pessoas, tarefas e um prazo. Isso reduz dúvidas sobre o próximo passo.'),
      item('market_7', 'math', 'Preço por unidade', 'Em outra compra, 6 cadernos custam R$ 48 e 10 cadernos iguais custam R$ 70.', 'Qual pacote tem o menor preço por caderno?', ['O de 6: R$ 6.', 'Os dois custam R$ 8 por caderno.', 'O de 10: R$ 7.', 'O de 10: R$ 10.'], 2, '48 ÷ 6 = R$ 8; 70 ÷ 10 = R$ 7. A comparação por unidade funciona fora da feira.', true),
      item('market_8', 'math', 'Receita e custo', 'Um grupo arrecadou R$ 250 em um evento e teve R$ 170 de despesas.', 'Quanto ficou depois das despesas?', ['R$ 420', 'R$ 250', 'R$ 170', 'R$ 80'], 3, '250 − 170 = R$ 80. Arrecadação e valor disponível depois dos gastos são medidas diferentes.', true),
    ],
  },
  {
    id: 'signal', title: 'Antes de compartilhar', place: 'Grupo da escola', icon: 'signal', color: '#bca7ff',
    description: 'Investigue uma mensagem, diferencie evidência de opinião e escreva uma resposta responsável.',
    outcome: 'Você conferiu o que uma mensagem sustenta antes de decidir compartilhá-la.',
    questions: [
      item('signal_1', 'words', 'Leitura crítica', 'Situação simulada: chega uma mensagem “AMANHÃ NÃO TEM AULA! Repasse!”. Ela não informa quem publicou nem a data.', 'Qual é o melhor primeiro passo?', ['Repassar para avisar logo.', 'Conferir um canal oficial da escola e a data.', 'Acreditar porque está em maiúsculas.', 'Excluir toda mensagem da escola.'], 1, 'A origem e a data permitem conferir se o aviso existe e se vale para amanhã. Urgência não substitui verificação.'),
      item('signal_2', 'logic', 'Evidências', 'A mensagem foi encaminhada muitas vezes.', 'O número de encaminhamentos prova que ela é verdadeira?', ['Sim, muita gente não pode errar.', 'Sim, desde que tenha emoji.', 'Não, popularidade não comprova o conteúdo.', 'Só se tiver mais de cem envios.'], 2, 'Uma afirmação pode circular muito sem ser verificada. Precisamos de evidência sobre o conteúdo.'),
      item('signal_3', 'words', 'Fato e opinião', 'Leia: “A reunião começa às 14h. Esse é o pior horário possível.”', 'Qual trecho expressa uma opinião?', ['“A reunião começa”.', '“Às 14h”.', '“A reunião começa às 14h”.', '“Esse é o pior horário possível”.'], 3, '“Pior” expressa uma avaliação. O horário pode ser conferido; a avaliação depende de quem fala e de seus critérios.'),
      item('signal_4', 'math', 'Leitura de dados', 'Uma enquete teve 40 respostas: 30 preferem reunião à tarde e 10, pela manhã.', 'Qual porcentagem dos participantes preferiu a tarde?', ['75%', '30%', '25%', '40%'], 0, '30 ÷ 40 = 0,75 = 75%. O resultado descreve quem respondeu, não automaticamente toda a escola.'),
      item('signal_5', 'logic', 'Generalização', 'Somente uma turma respondeu à enquete.', 'O que podemos dizer com segurança?', ['Toda a cidade prefere a tarde.', 'O resultado descreve as respostas daquela turma.', 'Todos os professores concordam.', 'A escola inteira respondeu.'], 1, 'A conclusão precisa respeitar quem foi ouvido. Para falar da escola inteira, seria preciso ampliar a coleta.'),
      item('signal_6', 'words', 'Comunicação clara', 'Você verificou o aviso e descobriu que a imagem era do ano passado.', 'Qual resposta ajuda o grupo?', ['“Vocês acreditam em tudo.”', '“Repassem por segurança.”', '“A imagem é do ano passado; o canal atual confirma aula amanhã.”', '“Não sei, mas deve ser verdade.”'], 2, 'A resposta corrige a informação com contexto e uma referência verificável, sem atacar quem compartilhou.'),
      item('signal_7', 'logic', 'Evidências', 'Agora um vídeo muito visto promete uma técnica de estudo milagrosa, sem mostrar como foi avaliada.', 'O que ajuda a avaliar a promessa?', ['Contar as curtidas.', 'Conferir apenas a música.', 'Confiar na palavra “milagrosa”.', 'Procurar a origem e evidências que sustentem a afirmação.'], 3, 'Assim como no aviso, circulação e linguagem convincente não comprovam uma afirmação.', true),
      item('signal_8', 'math', 'Leitura de dados', 'Em uma nova enquete, 18 de 24 participantes escolheram a opção A.', 'Qual porcentagem escolheu A?', ['75%', '18%', '24%', '50%'], 0, '18 ÷ 24 = 0,75 = 75%. Mudaram os números, mas a relação parte ÷ total continua a mesma.', true),
    ],
  },
];
