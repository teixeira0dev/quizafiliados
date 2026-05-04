interface Props {
  type: 'image' | 'video' | 'carousel' | 'transform';
  uuid?: string;
  width?: number;
  height?: number;
  label?: string;
}

const META: Record<Props['type'], { emoji: string; text: string }> = {
  image:     { emoji: '🖼️', text: 'IMAGEM EM PRODUÇÃO' },
  video:     { emoji: '🎬', text: 'VÍDEO EM PRODUÇÃO' },
  carousel:  { emoji: '🎠', text: 'CARROSSEL EM PRODUÇÃO' },
  transform: { emoji: '📊', text: 'ANTES / DEPOIS EM PRODUÇÃO' },
};

export default function MediaPlaceholder({ type, uuid, width = 740, height = 400, label }: Props) {
  const isVideo = type === 'video' || type === 'carousel';
  const ratio = isVideo ? 56.25 : Math.round((height / width) * 100);
  const { emoji, text } = META[type];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        paddingTop: `${ratio}%`,
        backgroundColor: '#161616',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px dashed #2e2e2e',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 16,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 28 }}>{emoji}</span>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label ?? text}
        </p>
        {uuid && (
          <p style={{ fontSize: 10, color: '#333', wordBreak: 'break-all', maxWidth: 200 }}>{uuid}</p>
        )}
      </div>
    </div>
  );
}
