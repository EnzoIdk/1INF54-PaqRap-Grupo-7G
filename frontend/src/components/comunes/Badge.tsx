interface BadgeProps {
  texto: string;
  colorFondo: string;
}

const Badge = ({ texto, colorFondo }: BadgeProps) => (
  <span
    style={{
      backgroundColor: colorFondo,
      color: "var(--color-fondo)",
      borderRadius: 12,
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    {texto}
  </span>
);

export default Badge;
