interface Props {
  title?: string;
  html: string;
  bgColor?: string;
  textColor?: string;
}

export default function NoteBlock({ title, html, bgColor = '#ffdd00', textColor = '#131313' }: Props) {
  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderRadius: 'var(--radius-lg)',
        padding: '20px 18px',
      }}
    >
      {title && (
        <p
          style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', marginBottom: '12px' }}
          dangerouslySetInnerHTML={{ __html: title }}
        />
      )}
      <div
        className="rt"
        style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.65 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
