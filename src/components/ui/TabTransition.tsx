import { ReactNode, useEffect, useState } from 'react';

interface TabTransitionProps {
  children: ReactNode;
  activeKey: string | number;
}

export default function TabTransition({ children, activeKey }: TabTransitionProps) {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // 탭이 변경되면 fade-out 시작
    setIsTransitioning(true);

    // fade-out 완료 후 컨텐츠 변경
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsTransitioning(false);
    }, 150); // fade-out 시간

    return () => clearTimeout(timer);
  }, [activeKey]);

  return (
    <div
      className={`transition-opacity duration-150 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {displayChildren}
    </div>
  );
}
