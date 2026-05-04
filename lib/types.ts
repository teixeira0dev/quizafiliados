export type ElementType =
  | 'textV2'
  | 'image'
  | 'video'
  | 'script'
  | 'button'
  | 'quizV2'
  | 'note'
  | 'title'
  | 'progressV2'
  | 'transform'
  | 'carousel'
  | 'containerV2';

export interface ImageData {
  uuid: string;
  width: number;
  height: number;
}

export interface QuizOption {
  id: string;
  text: { show: boolean; content: string } | string;
  emoji?: { show: boolean; content: string };
}

export interface FunnelElement {
  id: string;
  type: ElementType;
  title?: string;
  data: {
    text?: string;
    title?: string;
    style?: string;
    textSize?: string;
    textCustomSize?: number;
    textAlignment?: 'left' | 'center' | 'right';
    textLineHeight?: string;
    animation?: string;
    image?: ImageData;
    size?: string;
    alignment?: 'left' | 'center' | 'right';
    fixed?: boolean;
    colors?: Record<string, string>;
    videoId?: string;
    videoType?: string;
    pandaVideoId?: string;
    type?: string;
    script?: string;
    // quizV2
    content?: QuizOption[];
    options?: QuizOption[];
    model?: string;
    multiple?: boolean;
    // note
    background?: string;
    // containerV2 children (algumas versões do funil usam "children", outras "elements")
    children?: FunnelElement[];
    elements?: FunnelElement[];
    // progressV2
    total?: number;
    current?: number;
    // before/after
    aImage?: ImageData;
    bImage?: ImageData;
    aItems?: string[];
    bItems?: string[];
    // containerV2 style variant ('red-border' etc.)
    variant?: string;
  };
}

export interface FunnelPage {
  id: string;
  slug: string;
  title: string;
  backgroundColor?: string;
  textColor?: string;
  content: FunnelElement[];
}

export type ProfileKey = 'PERFIL_A' | 'PERFIL_B' | 'PERFIL_C';

export interface QuizAnswer {
  stepSlug: string;
  optionIndex: number;
}
