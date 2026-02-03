import { Link } from 'react-router-dom';
import Card from '../shared/components/Card';
import Button from '../shared/components/Button';
import pageLayout from '../shared/styles/page-layout.module.css';

function NotFoundPage() {
  return (
    <div className={pageLayout.pageContainer}>
      <Card>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/">
          <Button variant="primary">Go Home</Button>
        </Link>
      </Card>
    </div>
  );
}

export default NotFoundPage;
