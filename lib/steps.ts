import type { FunnelPage, FunnelElement } from './types';
import funnelRaw from '../funnel_parsed.json';
import affiliateConfig from '../affiliate-config.json';

/* URL de checkout. Afiliados editam apenas o campo `checkoutUrl` em
   `affiliate-config.json` (na raiz do projeto). Ver README.md.
   Se o JSON estiver vazio/ausente, cai no fallback hardcoded. */
export const PURCHASE_URL =
  affiliateConfig.checkoutUrl?.trim() ||
  'https://payment.ticto.app/O61DBFCFB?utm_source=quiz-app';

const funnel = funnelRaw as {
  nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; sourceHandle?: string }>;
};

// Build edge map: nodeId -> first target
const edgeMap: Record<string, string> = {};
funnel.edges.forEach((e) => {
  if (!edgeMap[e.source]) edgeMap[e.source] = e.target;
});

// Follow edges from start node to produce ordered page array
const startNode = funnel.nodes.find(
  (n) => n.type === 'function' && (n.data as { type?: string }).type === 'start'
);

const orderedIds: string[] = [];
const visited = new Set<string>();

function walk(nodeId: string) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  const node = funnel.nodes.find((n) => n.id === nodeId);
  if (node?.type === 'page') orderedIds.push(nodeId);
  const next = edgeMap[nodeId];
  if (next) walk(next);
}

if (startNode) walk(startNode.id);

// Add any remaining pages not reached
funnel.nodes
  .filter((n) => n.type === 'page' && !visited.has(n.id))
  .forEach((n) => orderedIds.push(n.id));

// Map to FunnelPage structure
const baseSteps: FunnelPage[] = orderedIds
  .map((id) => {
    const node = funnel.nodes.find((n) => n.id === id);
    if (!node) return null;
    const d = node.data as {
      slug: string;
      title: string;
      backgroundColor?: string;
      textColor?: string;
      content?: unknown[];
    };
    return {
      id: node.id,
      slug: d.slug,
      title: d.title,
      backgroundColor: d.backgroundColor,
      textColor: d.textColor,
      content: (d.content ?? []) as FunnelPage['content'],
    };
  })
  .filter(Boolean) as FunnelPage[];

/* ─────────────────────────────────────────────────────────
   FIXUPS — adições/correções aplicadas em runtime ao funil
   ───────────────────────────────────────────────────────── */

/* ID determinístico para a mídia da etapa 7 ("CONCLUA") em "Como funciona".
   Mantemos fixo pra o admin conseguir salvar overrides nesse slot. */
const STEP12_CONCLUA_MEDIA_ID = 'synthetic-2z1f1o46-conclua-media';
/* ID da textV2 que vira a etapa 7 (CONCLUA) — referência para localizar o
   ponto de inserção. */
const STEP12_CONCLUA_TEXT_ID = '0116337b-2eb1-4339-9f99-f3dcd6feca5f';

function addStep12ConcluaMedia(steps: FunnelPage[]): FunnelPage[] {
  const step12 = steps.find((s) => s.slug === '2z1f1o46');
  if (!step12) return steps;

  const concluaTextEl = step12.content.find((el) => el.id === STEP12_CONCLUA_TEXT_ID);
  /* Normaliza atributos da textV2 da etapa 7 pra bater com os 6 itens
     numerados acima (size 18, align left). No JSON original ela vinha
     centralizada e maior porque era a frase "Relaxa…", que agora foi
     reaproveitada como CONCLUA. */
  if (concluaTextEl) {
    concluaTextEl.data.textCustomSize = 18;
    concluaTextEl.data.textAlignment = 'left';
  }

  /* Já injetado? (idempotente) */
  if (step12.content.some((el) => el.id === STEP12_CONCLUA_MEDIA_ID)) return steps;

  const idx = step12.content.findIndex((el) => el.id === STEP12_CONCLUA_TEXT_ID);
  if (idx === -1) return steps;

  /* Slot de mídia novo — colocado logo após a textV2 da etapa 7 e antes do
     botão. Aparece como "EM PRODUÇÃO" até o admin subir/embedar algo.
     16:9 (mesma proporção que os scripts de vídeo dos itens 1–6). */
  const synthetic = {
    id: STEP12_CONCLUA_MEDIA_ID,
    type: 'image' as const,
    data: {
      image: { uuid: STEP12_CONCLUA_MEDIA_ID, width: 800, height: 450 },
    },
  };

  step12.content.splice(idx + 1, 0, synthetic);
  return steps;
}

/**
 * Patches de hierarquia visual:
 *  - Hero (etapa 1): headline maior pra criar contraste com o subheading.
 *  - Sales page (etapa 13): manter como está; o ajuste é feito via clamp()
 *    no QuizStep para não encolher textos pequenos demais no mobile.
 */
function patchHierarchy(steps: FunnelPage[]): FunnelPage[] {
  const hero = steps.find((s) => s.slug === '564p0l6u');
  if (hero) {
    const headline = hero.content.find(
      (el) => el.id === '54048ea7-293d-4f42-8897-bfec52f7e950',
    );
    if (headline) {
      headline.data.textCustomSize = 30;        // antes: 21
      headline.data.textLineHeight = 'verySmall';
    }
    const sub = hero.content.find(
      (el) => el.id === '438f83fa-2f7f-4dad-ad4b-9f3f8f884f48',
    );
    if (sub) {
      sub.data.textCustomSize = 16;             // antes: 20 (suaviza o sub)
    }
  }
  return steps;
}

/**
 * O CTA da etapa 3 ("QUERO SAIR DA PRISÃO!") era o único `fixed: true` do
 * funil — ficava colado no rodapé com position fixed, fora do fluxo, e
 * sobrepunha a animação do labirinto. Forçar inline pra ficar consistente
 * com todos os outros CTAs do quiz.
 */
function unfixStep3Button(steps: FunnelPage[]): FunnelPage[] {
  const step3 = steps.find((s) => s.slug === '290p3a4r');
  if (!step3) return steps;
  const btn = step3.content.find(
    (el) => el.id === '298d8767-b76d-4a2b-9630-72f03656485d',
  );
  if (btn) btn.data.fixed = false;
  return steps;
}

/* IDs determinísticos pros 3 vídeos extras (depoimentos) na etapa 8
   (slug 0y610p2f, "Vinicios decidiu ativar"). Inseridos imediatamente
   antes do botão pra ficarem como bloco de prova social acima do CTA.
   Cada um vira um slot de mídia que pode ser sobrescrito via media-
   overrides — os embeds em si são gravados pelo cache. */
const STEP_VINICIOS_SLUG = '0y610p2f';
const STEP_VINICIOS_BUTTON_ID = '72294286-3484-4d70-9073-cd67cc7c727a';
const STEP_VINICIOS_VIDEO_IDS = [
  'synthetic-0y610p2f-video-1',
  'synthetic-0y610p2f-video-2',
  'synthetic-0y610p2f-video-3',
] as const;

function addVinciosVideoSlots(steps: FunnelPage[]): FunnelPage[] {
  const step = steps.find((s) => s.slug === STEP_VINICIOS_SLUG);
  if (!step) return steps;

  /* Idempotente: se já injetados, não duplica */
  if (step.content.some((el) => el.id === STEP_VINICIOS_VIDEO_IDS[0])) return steps;

  const btnIdx = step.content.findIndex((el) => el.id === STEP_VINICIOS_BUTTON_ID);
  if (btnIdx === -1) return steps;

  const synthetic = STEP_VINICIOS_VIDEO_IDS.map((id) => ({
    id,
    type: 'video' as const,
    data: { videoId: id, type: 'embed' },
  }));

  step.content.splice(btnIdx, 0, ...synthetic);
  return steps;
}

/* Step sintético de urgência inserido logo após "Será que 40 dias…" (slug
   2f1o2d2r). Conteúdo veio do bloco de urgência da landing page. */
const URGENCY_STEP_ID = 'synthetic-urgency-step';
const URGENCY_STEP_SLUG = 'synthetic-urgency';
const URGENCY_STEP_BUTTON_ID = `${URGENCY_STEP_ID}-button`;

function addUrgencyStep(steps: FunnelPage[]): FunnelPage[] {
  if (steps.some((s) => s.slug === URGENCY_STEP_SLUG)) return steps;
  const afterIdx = steps.findIndex((s) => s.slug === '2f1o2d2r');
  if (afterIdx === -1) return steps;

  const page: FunnelPage = {
    id: URGENCY_STEP_ID,
    slug: URGENCY_STEP_SLUG,
    title: 'Urgência',
    content: [
      {
        id: `${URGENCY_STEP_ID}-progress`,
        type: 'progressV2',
        data: {},
      },
      {
        id: `${URGENCY_STEP_ID}-headline`,
        type: 'textV2',
        data: {
          text:
            '<p style="font-size:26px;line-height:1.15;text-align:left;margin-bottom:8px"><strong><span style="color: rgb(255, 51, 51);">Seu tempo de vida é curto.</span></strong></p>' +
            '<p style="text-align:left;margin-bottom:0">E você ainda insiste em jogar fora a <strong>única chance</strong> que tem...</p>',
          textAlignment: 'left',
        },
      },
      {
        id: `${URGENCY_STEP_ID}-body-1`,
        type: 'textV2',
        data: {
          text:
            '<p style="text-align:left">Enquanto isso... <strong>pessoas comuns</strong> estão construindo um futuro que você sempre sonhou.</p>',
          textAlignment: 'left',
        },
      },
      {
        id: `${URGENCY_STEP_ID}-body-2`,
        type: 'textV2',
        data: {
          text:
            '<p style="text-align:left">Eu sei que essa sensação de estar ficando pra trás te consome por dentro.</p>' +
            '<p></p>' +
            '<p style="text-align:left">A diferença entre você e elas não é <em>sorte</em>, nem <em>privilégios</em>. É a <strong>coragem de dizer “Chega!”</strong>.</p>',
          textAlignment: 'left',
        },
      },
      {
        id: `${URGENCY_STEP_ID}-body-3`,
        type: 'textV2',
        data: {
          text:
            '<p style="text-align:left"><span style="color: rgb(255, 51, 51);"><strong>Cada dia longe da Caverna é mais uma pá de Terra no próprio túmulo.</strong></span></p>' +
            '<p></p>' +
            '<p style="text-align:left">Espero que, quando você finalmente perceber isso, <strong>não seja tarde demais</strong>.</p>',
          textAlignment: 'left',
        },
      },
      {
        id: URGENCY_STEP_BUTTON_ID,
        type: 'button',
        data: {
          title: '<p>SIM. ESTOU DECIDIDO(A)</p>',
          fixed: false,
          alignment: 'center',
          animation: 'pulse',
        },
      },
    ],
  };

  steps.splice(afterIdx + 1, 0, page);
  return steps;
}


/* Step 3 (slug 4a2w3x17, "A saída existe"): o slot 57121e33 originalmente
   é imagem mas tem override de video-embed (player vTurb); o slot 4b3e7c5c
   originalmente é vídeo YouTube mas tem override de image-upload. Ordem
   crua do funil: bullets → vídeo → título → imagem → texto-depoimento.
   Reordenamos pra:
     bullets → título → vídeo → texto-depoimento → imagem → A pergunta é.
   Assim o título "Eu também precisei pagar esse preço" antecede o vídeo
   e o depoimento "Em menos de 1 ano…" vem logo após o vídeo. */
function reorderStep3(steps: FunnelPage[]): FunnelPage[] {
  const step = steps.find((s) => s.slug === '4a2w3x17');
  if (!step) return steps;

  const TITLE_ID = '9c67ada7-9c4c-4e98-8530-60f0aaacba54';
  const VIDEO_ID = '57121e33-0c86-4560-a3a1-444c29a531a0';
  const DEPOIMENTO_ID = '6e96ef23-216f-403f-a355-adcc11951525';

  /* (1) move o título pra antes do vídeo */
  {
    const titleIdx = step.content.findIndex((el) => el.id === TITLE_ID);
    const videoIdx = step.content.findIndex((el) => el.id === VIDEO_ID);
    if (titleIdx !== -1 && videoIdx !== -1 && titleIdx > videoIdx) {
      const [title] = step.content.splice(titleIdx, 1);
      const newVideoIdx = step.content.findIndex((el) => el.id === VIDEO_ID);
      step.content.splice(newVideoIdx, 0, title);
    }
  }

  /* (2) move o depoimento pra logo depois do vídeo (antes da imagem
     decorativa 4b3e7c5c que ficaria entre vídeo e depoimento) */
  {
    const videoIdx = step.content.findIndex((el) => el.id === VIDEO_ID);
    const depoIdx = step.content.findIndex((el) => el.id === DEPOIMENTO_ID);
    if (videoIdx !== -1 && depoIdx !== -1 && depoIdx !== videoIdx + 1) {
      const [depo] = step.content.splice(depoIdx, 1);
      const newVideoIdx = step.content.findIndex((el) => el.id === VIDEO_ID);
      step.content.splice(newVideoIdx + 1, 0, depo);
    }
  }

  return steps;
}

/* Agrupa título "Eu também precisei pagar esse preço" + vídeo vTurb no
   step 3 em um containerV2 com borda vermelha, sem fundo branco. */
function wrapStep3VideoBox(steps: FunnelPage[]): FunnelPage[] {
  const step = steps.find((s) => s.slug === '4a2w3x17');
  if (!step) return steps;
  if (step.content.some((el) => el.id === 'synthetic-step3-video-box')) return steps;

  const TITLE_ID = '9c67ada7-9c4c-4e98-8530-60f0aaacba54';
  const VIDEO_ID = '57121e33-0c86-4560-a3a1-444c29a531a0';
  const titleIdx = step.content.findIndex((el) => el.id === TITLE_ID);
  const videoIdx = step.content.findIndex((el) => el.id === VIDEO_ID);
  if (titleIdx === -1 || videoIdx === -1) return steps;

  const title = step.content[titleIdx];
  const video = step.content[videoIdx];
  const insertAt = Math.min(titleIdx, videoIdx);
  step.content = step.content.filter((el) => el.id !== TITLE_ID && el.id !== VIDEO_ID);
  step.content.splice(insertAt, 0, {
    id: 'synthetic-step3-video-box',
    type: 'containerV2' as const,
    data: { variant: 'red-border', children: [title, video] },
  });
  return steps;
}

/* Troca a posição de duas telas no fluxo (por slug). */
function swapSteps(steps: FunnelPage[], slug1: string, slug2: string): FunnelPage[] {
  const i1 = steps.findIndex((s) => s.slug === slug1);
  const i2 = steps.findIndex((s) => s.slug === slug2);
  if (i1 === -1 || i2 === -1) return steps;
  [steps[i1], steps[i2]] = [steps[i2], steps[i1]];
  return steps;
}

/* Substitui o slot mois.png pelo container bíblico (Noé/Moisés/Jesus)
   no passo do Ritual (slug 5d2w2e5q, índice 5). */
const BIBLE_HTML =
  '<div style="border:1.5px solid #ff3333;border-radius:12px;padding:18px 18px 14px;background:rgba(255,51,51,0.04);">' +
  '<p style="font-size:14px;line-height:1.5;margin-bottom:16px;">Na bíblia, esse mesmo período é utilizado para simbolizar tempos de <strong>provação, preparação e renovação.</strong></p>' +
  '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">' +
  '<img src="/noe.webp" style="width:62px;height:62px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#333;" alt="Noé" loading="lazy" decoding="async">' +
  '<p style="font-size:13px;line-height:1.5;margin:0;"><strong>Noé</strong> enfrentou o dilúvio por 40 dias e 40 noites. Isso marcou uma limpeza e recomeço na Terra.</p>' +
  '</div>' +
  '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">' +
  '<img src="/moise.webp" style="width:62px;height:62px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#333;" alt="Moisés" loading="lazy" decoding="async">' +
  '<p style="font-size:13px;line-height:1.5;margin:0;"><strong>Moisés</strong> permaneceu no Monte Sinai por 40 dias e 40 noites. Lá recebeu a sabedoria que mudaria a história do seu povo.</p>' +
  '</div>' +
  '<div style="display:flex;align-items:flex-start;gap:12px;">' +
  '<img src="/jes.webp" style="width:62px;height:62px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#333;" alt="Jesus" loading="lazy" decoding="async">' +
  '<p style="font-size:13px;line-height:1.5;margin:0;"><strong>Jesus</strong> jejuou por 40 dias e 40 noites no deserto. Antes de iniciar sua missão, ele precisou vencer a sí mesmo e as tentações.</p>' +
  '</div>' +
  '</div>';

function replaceMoisWithBibleContainer(steps: FunnelPage[]): FunnelPage[] {
  const step = steps.find((s) => s.slug === '5d2w2e5q');
  if (!step) return steps;
  if (step.content.some((el) => el.id === 'synthetic-bible-container')) return steps;
  const idx = step.content.findIndex((el) => el.id === 'b671e184-1ccd-4cce-a7d6-de26d9dc9e9d');
  if (idx === -1) return steps;
  step.content.splice(idx, 1, {
    id: 'synthetic-bible-container',
    type: 'textV2' as const,
    data: { text: BIBLE_HTML, textAlignment: 'left' as const },
  });
  return steps;
}

/* Container de oferta no step de vendas (slug 385o1j6b):
   - Reordena: bio (idx 16) antes do before/after (idx 15)
   - Injeta o container de oferta entre bio e before/after */
const OFFER_CONTAINER_HTML =
  /* Wrapper sem overflow:hidden para permitir a sobreposição do mkpbs.png */
  '<div style="position:relative;">' +
  /* cavemode.png com rounded top */
  '<div style="position:relative;border-radius:16px 16px 0 0;overflow:hidden;">' +
  '<img src="/cavemode.webp" style="width:100%;display:block;" alt="" loading="lazy" decoding="async">' +
  '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.35));pointer-events:none;"></div>' +
  '</div>' +
  /* mkpbs.png (PNG transparente, 1583x986 ratio 1.605). 1/4 da altura sobe no
     cavemode (margin-top -15%) e 3/4 invade o card branco (margin-bottom -44%).
     drop-shadow segue o contorno real dos celulares (PNG transparente). */
  '<div style="position:relative;z-index:2;width:calc(100% - 24px);aspect-ratio:1583/986;margin:-15% auto -44% auto;">' +
  '<img src="/mkpbs.webp" style="width:100%;height:100%;display:block;transform:scale(1.2);transform-origin:center;filter:drop-shadow(0 10px 18px rgba(0,0,0,0.45));" alt="" loading="lazy" decoding="async">' +
  '</div>' +
  /* Card branco precisa de padding-top suficiente pra acomodar os 3/4 do mkpbs
     que invadem o topo (44%) + 16px de respiro pro conteúdo */
  '<div style="background:#fff;color:#111;border-radius:0 0 16px 16px;' +
  'position:relative;z-index:1;padding:calc(45% + 16px) 22px 28px;">' +
  '<p style="font-size:15px;font-weight:600;color:rgba(0,0,0,0.5);margin-bottom:12px;">Você recebe:</p>' +
  '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px;">' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Acesso ao Aplicativo (IOS ou Android)</div>' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Curso Modo Caverna</div>' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Suporte Exclusivo</div>' +
  '</div>' +
  '<p style="font-size:15px;font-weight:600;color:rgba(0,0,0,0.5);margin-bottom:12px;">Bônus exclusivos:</p>' +
  '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:22px;">' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Mentoria 5 mil reais em 40 dias</div>' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Guia para definição de metas</div>' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Os segredos da lei da atração</div>' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Detox Digital</div>' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Manual para criação de hábitos</div>' +
  '<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;"><span style="color:#16a349;font-weight:700;">✓</span> Protocolo anti procrastinação</div>' +
  '</div>' +
  '<div style="border:1px solid rgba(0,0,0,0.1);border-radius:12px;padding:20px;text-align:center;margin-bottom:10px;">' +
  '<p style="font-size:13px;color:rgba(0,0,0,0.5);margin-bottom:10px;">Tudo isso, de <s style="color:#ee4444;font-weight:600;">R$ 499</s> por apenas...</p>' +
  '<div style="display:flex;align-items:baseline;justify-content:center;gap:6px;">' +
  '<span style="font-size:20px;font-weight:700;color:#16a349;">11x de</span>' +
  '<span style="font-size:58px;font-weight:900;color:#16a349;line-height:1;">6 REAIS</span>' +
  '</div>' +
  '<p style="font-size:14px;margin-top:8px;color:#111;">ou <b style="color:#16a349;">R$ 59</b> à vista no pix</p>' +
  `<a href="${PURCHASE_URL}" target="_blank" rel="noopener" style="display:block;margin-top:16px;background:#16a349;color:#fff;font-size:17px;font-weight:800;text-align:center;padding:15px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">COMPRAR AGORA</a>` +
  '</div>' +
  '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;">' +
  '<img src="https://desafio.modocaverna.com/wp-content/webp-express/webp-images/uploads/2026/02/fdbcks.png.webp"' +
  ' style="height:22px;width:auto;" alt="" loading="lazy">' +
  '<span style="font-size:12px;color:rgba(0,0,0,0.55);">+ de 50.000 usuários</span>' +
  '</div>' +
  '</div>' +
  '</div>';

function injectOfferInIdealizador(steps: FunnelPage[]): FunnelPage[] {
  const step = steps.find((s) => s.slug === '385o1j6b');
  if (!step) return steps;
  if (step.content.some((el) => el.id === 'synthetic-offer-container')) return steps;

  const IMAGEM_ID      = '1a5ba815-4e05-4fe9-b7c9-1dc8b46490de';
  const BA_ID          = '8a2d0724-8b43-44a3-801d-d50cda48c7f8';
  const LOGO_ID        = '0e34c078-8069-48bb-9e5c-dac53a4d8943';
  const IDEALIZADOR_ID = 'df598497-a8ec-4852-821c-77410bb458c2';
  const BIO_ID         = '8d5c1cb5-36cf-4336-acf5-8bff91e35caa';
  const BTN1_ID        = '3ddb8961-6894-4c56-b83e-98c5c4ea8e23';
  const BTN2_ID        = 'a230e967-05bf-40ba-849a-c54725af5ccf';

  const offerEl = {
    id: 'synthetic-offer-container',
    type: 'textV2' as const,
    data: { text: OFFER_CONTAINER_HTML, textAlignment: 'left' as const },
  };
  const offerEl2 = {
    id: 'synthetic-offer-container-2',
    type: 'textV2' as const,
    data: { text: OFFER_CONTAINER_HTML, textAlignment: 'left' as const },
  };

  /* 1 — Substitui IMAGEM EM PRODUÇÃO pelo card de oferta */
  const imagemIdx = step.content.findIndex((el) => el.id === IMAGEM_ID);
  if (imagemIdx !== -1) step.content.splice(imagemIdx, 1, offerEl);

  /* 2 — Remove before/after */
  const baIdx = step.content.findIndex((el) => el.id === BA_ID);
  if (baIdx !== -1) step.content.splice(baIdx, 1);

  /* 3 — Remove logo pequena */
  const logoIdx = step.content.findIndex((el) => el.id === LOGO_ID);
  if (logoIdx !== -1) step.content.splice(logoIdx, 1);

  /* 4 — Remove label "Conheça o idealizador do método" */
  const idealizadorIdx = step.content.findIndex((el) => el.id === IDEALIZADOR_ID);
  if (idealizadorIdx !== -1) step.content.splice(idealizadorIdx, 1);

  /* 5 — Remove botões externos de compra */
  for (const btnId of [BTN1_ID, BTN2_ID]) {
    const idx = step.content.findIndex((el) => el.id === btnId);
    if (idx !== -1) step.content.splice(idx, 1);
  }

  /* 6 — Injeta ideal.png imediatamente antes da bio */
  const bioIdxForImg = step.content.findIndex((el) => el.id === BIO_ID);
  if (bioIdxForImg !== -1) {
    step.content.splice(bioIdxForImg, 0, {
      id: 'synthetic-ideal-img',
      type: 'image' as const,
      data: { image: { uuid: 'synthetic-ideal-img', width: 800, height: 600 } },
    });
  }

  /* 7 — Insere segundo card de oferta após a bio */
  const bioIdx = step.content.findIndex((el) => el.id === BIO_ID);
  if (bioIdx !== -1) step.content.splice(bioIdx + 1, 0, offerEl2);

  /* 8 — FAQ abaixo do segundo card */
  const FAQ_HTML =
    '<p style="text-align:center;font-weight:700;font-size:22px;margin:28px 0 16px;color:#fff;">Perguntas frequentes:</p>' +
    '<style>' +
    'details.mc-faq{background:#27272A;border-radius:6px;margin-bottom:10px;overflow:hidden}' +
    'details.mc-faq summary{color:#E0E0E0;font-size:15px;font-weight:500;padding:14px 16px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    'details.mc-faq summary::-webkit-details-marker{display:none}' +
    'details.mc-faq summary::after{content:"▾";flex-shrink:0;transition:transform 0.25s}' +
    'details.mc-faq[open] summary::after{transform:rotate(-180deg)}' +
    'details.mc-faq .mc-faq-body{padding:0 16px 14px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.55}' +
    '</style>' +
    '<details class="mc-faq"><summary>O que receberei ao comprar?</summary><div class="mc-faq-body">Acesso ao Aplicativo (iOS ou Android), Curso Modo Caverna, Suporte Exclusivo e todos os bônus exclusivos incluídos na oferta.</div></details>' +
    '<details class="mc-faq"><summary>Quando/como receberei o acesso?</summary><div class="mc-faq-body">O acesso é liberado imediatamente após a confirmação do pagamento. Você receberá as instruções no e-mail cadastrado.</div></details>' +
    '<details class="mc-faq"><summary>Como funciona o suporte?</summary><div class="mc-faq-body">Nosso suporte exclusivo está disponível para todos os membros do Modo Caverna para tirar dúvidas e auxiliar na sua jornada.</div></details>' +
    '<details class="mc-faq"><summary>E se eu não gostar?</summary><div class="mc-faq-body">Você tem 7 dias de garantia incondicional. Se não ficar satisfeito por qualquer motivo, devolvemos 100% do seu investimento.</div></details>' +
    '<details class="mc-faq"><summary>É compatível com qualquer dispositivo?</summary><div class="mc-faq-body">Sim! O aplicativo Modo Caverna está disponível para iOS e Android, compatível com qualquer smartphone.</div></details>';

  const faqEl = {
    id: 'synthetic-faq',
    type: 'textV2' as const,
    data: { text: FAQ_HTML, textAlignment: 'left' as const },
  };
  const offer2Idx = step.content.findIndex((el) => el.id === 'synthetic-offer-container-2');
  if (offer2Idx !== -1) step.content.splice(offer2Idx + 1, 0, faqEl);

  /* 9 — Fundo preto na última tela */
  step.backgroundColor = '#000000';

  return steps;
}

/* Move o texto "40 dias com disciplina..." para antes da imagem no step
   da Sala do Tempo (slug 2f1o2d2r): 7dda4a20 ↔ 3d03c443 */
function reorderDragonBallText(steps: FunnelPage[]): FunnelPage[] {
  const step = steps.find((s) => s.slug === '2f1o2d2r');
  if (!step) return steps;
  const TEXT_ID = '7dda4a20-b2e1-4c5f-8c16-2ce396047ff8';
  const IMG_ID  = '3d03c443-535b-48e9-b2a6-e172c706b1b7';
  const textIdx = step.content.findIndex((el) => el.id === TEXT_ID);
  const imgIdx  = step.content.findIndex((el) => el.id === IMG_ID);
  if (textIdx === -1 || imgIdx === -1 || textIdx < imgIdx) return steps;
  const [text] = step.content.splice(textIdx, 1);
  const newImgIdx = step.content.findIndex((el) => el.id === IMG_ID);
  step.content.splice(newImgIdx, 0, text);
  return steps;
}

/* Agrupa cada par (textV2 do passo + script de vídeo) do step "Como funciona"
   (slug 2z1f1o46) em um containerV2 com borda vermelha. */
const COMO_STEPS_TEXT_IDS = [
  '11bff83f-f408-4c66-a0f4-746e00fa34be',
  'ea86f833-c062-4e76-af0d-b58ef6f2aecd',
  'af606d9c-86bf-41a2-9fba-8bfc9cec1bcf',
  '8eb92efe-83e2-4186-92ef-a742421ba26c',
  '57521fa8-68a3-4d8d-91e6-ae65f4241c9d',
  '4b1983e2-2992-445a-8fce-0015381ac2b7',
  '0116337b-2eb1-4339-9f99-f3dcd6feca5f',
];

function wrapComoFuncionaContainers(steps: FunnelPage[]): FunnelPage[] {
  const step = steps.find((s) => s.slug === '2z1f1o46');
  if (!step) return steps;
  if (step.content.some((el) => el.id === 'synthetic-como-container-0')) return steps;

  const newContent: FunnelElement[] = [];
  let i = 0;
  while (i < step.content.length) {
    const el = step.content[i];
    const stepNum = COMO_STEPS_TEXT_IDS.indexOf(el.id);
    if (stepNum !== -1) {
      const next = step.content[i + 1];
      if (next) {
        newContent.push({
          id: `synthetic-como-container-${stepNum}`,
          type: 'containerV2' as const,
          data: { variant: 'red-border', children: [el, next] },
        });
        i += 2;
      } else {
        newContent.push(el);
        i++;
      }
    } else {
      newContent.push(el);
      i++;
    }
  }
  step.content = newContent;
  return steps;
}

addStep12ConcluaMedia(baseSteps);
addUrgencyStep(baseSteps);
addVinciosVideoSlots(baseSteps);
reorderStep3(baseSteps);
wrapStep3VideoBox(baseSteps);
replaceMoisWithBibleContainer(baseSteps);
injectOfferInIdealizador(baseSteps);
reorderDragonBallText(baseSteps);
wrapComoFuncionaContainers(baseSteps);
/* "Ao final dos 40 dias" (2o1k6r1a) vem antes de "Como funciona" (2z1f1o46) */
swapSteps(baseSteps, '2z1f1o46', '2o1k6r1a');
patchHierarchy(baseSteps);
unfixStep3Button(baseSteps);

export const STEPS: FunnelPage[] = baseSteps;
/* PURCHASE_URL declarado no topo do arquivo (linha 8) — lê de affiliate-config.json */
